import { lazy, Suspense, useMemo, useState, type ReactNode } from "react";
import { MasterCvEditor } from "./components/MasterCvEditor";
import { OfferPanel } from "./components/OfferPanel";
import { extractTextFromFile } from "./lib/extractText";
import { structureCv } from "./lib/api";
import {
  clearMasterCv,
  downloadMasterCv,
  loadMasterCv,
  readMasterCvFile,
  saveMasterCv,
} from "./lib/storage";
import { MasterCvSchema, type MasterCv } from "./shared/schemas";
import { masterToResolved } from "./shared/cv";

// Fixture de développement : facultative, absente du déploiement (.vercelignore)
const fixtureLoaders = import.meta.glob<unknown>("./fixtures/master-cv.json", { import: "default" });
const loadFixture: (() => Promise<unknown>) | undefined = fixtureLoaders["./fixtures/master-cv.json"];

// Chargé uniquement à l'ouverture de l'onglet « Aperçu PDF » (module lourd)
const CvPreview = lazy(() => import("./components/CvPreview"));

type Status = "idle" | "reading" | "structuring";
type View = "edit" | "preview";
type Step = "cv" | "offer";

const STATUS_LABEL: Record<Status, string> = {
  idle: "",
  reading: "Lecture du fichier…",
  structuring: "Structuration par l'IA…",
};

const btn =
  "rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50 cursor-pointer";

const toMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

function StepTab({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md px-4 py-1.5 text-sm font-medium ${
        active ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

export default function App() {
  const [initial] = useState(() => loadMasterCv());
  const [cv, setCv] = useState<MasterCv | null>(initial?.cv ?? null);
  const [savedAt, setSavedAt] = useState<string | null>(initial?.savedAt ?? null);
  const [status, setStatus] = useState<Status>("idle");
  const [rawText, setRawText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("edit");
  const [step, setStep] = useState<Step>("cv");

  const busy = status !== "idle";
  const currentStep: Step = cv ? step : "cv";
  const resolvedCv = useMemo(() => (cv ? masterToResolved(cv) : null), [cv]);

  /** Point d'entrée unique pour modifier le CV : affiche et enregistre. */
  function commitCv(next: MasterCv) {
    setCv(next);
    try {
      setSavedAt(saveMasterCv(next));
    } catch {
      setError("Impossible d'enregistrer dans le navigateur (stockage plein ou désactivé).");
    }
  }

  function confirmReplace(): boolean {
    return !cv || window.confirm("Remplacer le CV actuellement enregistré ?");
  }

  async function handleCvFile(file: File) {
    if (!confirmReplace()) return;
    setError(null);
    setRawText("");
    setView("edit");
    try {
      setStatus("reading");
      const text = await extractTextFromFile(file);
      setRawText(text);

      setStatus("structuring");
      commitCv(await structureCv(text));
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setStatus("idle");
    }
  }

  async function handleJsonImport(file: File) {
    if (!confirmReplace()) return;
    setError(null);
    try {
      commitCv(await readMasterCvFile(file));
      setRawText("");
      setView("edit");
    } catch (e) {
      setError(toMessage(e));
    }
  }

  async function handleFixture() {
    if (!loadFixture || !confirmReplace()) return;
    setError(null);
    setRawText("");
    setView("edit");
    commitCv(MasterCvSchema.parse(await loadFixture()));
  }

  function handleClear() {
    if (!window.confirm("Supprimer votre CV enregistré dans ce navigateur ?")) return;
    clearMasterCv();
    setCv(null);
    setSavedAt(null);
    setRawText("");
    setError(null);
    setView("edit");
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">CV Tailor</h1>
        <nav className="flex gap-1 rounded-lg border border-gray-200 p-1">
          <StepTab active={currentStep === "cv"} onClick={() => setStep("cv")}>
            1. Mon CV
          </StepTab>
          <StepTab active={currentStep === "offer"} disabled={!cv} onClick={() => setStep("offer")}>
            2. Candidature
          </StepTab>
        </nav>
      </header>

      {currentStep === "offer" && cv ? (
        <OfferPanel cv={cv} />
      ) : (
        <>
          {/* Import */}
          <section className="space-y-3 rounded-lg border border-gray-200 p-4">
            <h2 className="font-medium">Importer votre CV</h2>

            <div className="flex flex-wrap items-center gap-3">
              <label className={btn}>
                Importer un CV (PDF ou DOCX)
                <input
                  type="file"
                  accept=".pdf,.docx"
                  disabled={busy}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) handleCvFile(file);
                  }}
                />
              </label>

              <label className={btn}>
                Restaurer une sauvegarde
                <input
                  type="file"
                  accept=".json,application/json"
                  disabled={busy}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) handleJsonImport(file);
                  }}
                />
              </label>

              {import.meta.env.DEV && loadFixture && (
                <button type="button" className={btn} disabled={busy} onClick={handleFixture}>
                  Charger le CV d'exemple (dev)
                </button>
              )}
            </div>

            {busy && <p className="text-sm text-gray-600">{STATUS_LABEL[status]}</p>}
            {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          </section>

          {cv && (
            <>
              {/* Barre de sauvegarde */}
              <section className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white/95 p-4 backdrop-blur">
                <div>
                  <h2 className="font-medium">Vérifiez et complétez votre CV</h2>
                  <p className="text-sm text-gray-600">
                    Ce CV sert de base à toutes vos candidatures : corrigez-le une fois, il sera réutilisé.
                  </p>
                  <p className="text-xs text-gray-500">
                    {savedAt
                      ? `Enregistré automatiquement · ${new Date(savedAt).toLocaleString("fr-FR")}`
                      : "Non enregistré"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="flex rounded border border-gray-300 p-0.5">
                    {(["edit", "preview"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setView(v)}
                        className={`rounded px-3 py-1 text-sm ${
                          view === v ? "bg-gray-900 text-white" : "hover:bg-gray-50"
                        }`}
                      >
                        {v === "edit" ? "Modifier" : "Aperçu PDF"}
                      </button>
                    ))}
                  </div>

                  <button type="button" className={btn} onClick={() => downloadMasterCv(cv)}>
                    Télécharger une sauvegarde
                  </button>
                  <button
                    type="button"
                    className={`${btn} border-red-300 text-red-700 hover:bg-red-50`}
                    onClick={handleClear}
                  >
                    Supprimer
                  </button>
                </div>
              </section>

              {view === "edit" ? (
                <div className={rawText ? "grid gap-6 lg:grid-cols-[1fr_22rem]" : ""}>
                  <MasterCvEditor cv={cv} onChange={commitCv} />
                  {rawText && (
                    <aside className="lg:sticky lg:top-28 lg:self-start">
                      <h2 className="mb-2 text-sm font-medium">Texte extrait (référence)</h2>
                      <pre className="max-h-[75vh] overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-4 text-xs">
                        {rawText}
                      </pre>
                    </aside>
                  )}
                </div>
              ) : (
                <Suspense fallback={<p className="text-sm text-gray-600">Chargement de l'aperçu…</p>}>
                  {resolvedCv && <CvPreview cv={resolvedCv} />}
                </Suspense>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}