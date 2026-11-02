import { useMemo, useState } from "react";
import { generateLetter } from "../lib/api";
import { checkLetter, letterToDraft, type LetterDraft } from "../shared/letter";
import type { MasterCv, OfferAnalysis } from "../shared/schemas";
import type { Check } from "../shared/tailor";

type Tone = "professional" | "direct";
type Length = "short" | "standard";

const btn = "rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50";
const primaryBtn = "rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50";
const inputCls =
  "w-full rounded border border-gray-300 p-2 text-sm focus:border-gray-900 focus:outline-none disabled:bg-gray-50";
const selectCls = "ml-1 rounded border border-gray-300 px-2 py-1 text-sm";

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function LetterPanel({
  cv,
  analysis,
  accepted,
  offerText,
  draft,
  canGenerate,
  onDraftChange,
}: {
  cv: MasterCv;
  analysis: OfferAnalysis;
  accepted: string[];
  offerText: string;
  draft: LetterDraft | null;
  canGenerate: boolean;
  onDraftChange: (draft: LetterDraft | null) => void;
}) {
  const [open, setOpen] = useState(draft !== null);
  const [tone, setTone] = useState<Tone>("professional");
  const [length, setLength] = useState<Length>("standard");
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checks = useMemo(
    () => (draft ? checkLetter(cv, analysis, accepted, offerText, draft) : []),
    [cv, analysis, accepted, offerText, draft],
  );

  async function handleGenerate() {
    if (draft && !window.confirm("Remplacer la lettre actuelle, y compris vos modifications ?")) return;
    setError(null);
    setGenerating(true);
    try {
      const letter = await generateLetter({ cv, analysis, accepted, offerText, tone, length });
      onDraftChange(letterToDraft(letter));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(`${draft.body}\n\n${cv.contact.fullName}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copie impossible : sélectionnez le texte manuellement.");
    }
  }

  async function handleDownload() {
    if (!draft) return;
    setDownloading(true);
    try {
      // Chargement à la demande du module PDF
      const [{ pdf }, { LetterDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../pdf/LetterDocument"),
      ]);
      const blob = await pdf(
        <LetterDocument contact={cv.contact} draft={draft} company={analysis.company} lang={analysis.language} />,
      ).toBlob();
      const name = ["Lettre", slug(cv.contact.fullName), slug(analysis.company ?? analysis.jobTitle)]
        .filter(Boolean)
        .join("-");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${name}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDownloading(false);
    }
  }

  function handleClear() {
    if (window.confirm("Effacer la lettre ?")) onDraftChange(null);
  }

  return (
    <section className="space-y-4 rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">Lettre de motivation</h2>
          <p className="text-sm text-gray-600">
            Optionnelle : rédigée à partir de l'offre et de votre CV, sans rien inventer.
          </p>
        </div>
        {!open && (
          <button type="button" className={btn} onClick={() => setOpen(true)}>
            Rédiger une lettre
          </button>
        )}
      </div>

      {open && (
        <>
          {/* Options */}
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm text-gray-700">
              Ton
              <select
                value={tone}
                disabled={generating}
                onChange={(e) => setTone(e.target.value as Tone)}
                className={selectCls}
              >
                <option value="professional">Professionnel</option>
                <option value="direct">Direct</option>
              </select>
            </label>
            <label className="text-sm text-gray-700">
              Longueur
              <select
                value={length}
                disabled={generating}
                onChange={(e) => setLength(e.target.value as Length)}
                className={selectCls}
              >
                <option value="short">Courte (~180 mots)</option>
                <option value="standard">Standard (~280 mots)</option>
              </select>
            </label>
            <button
              type="button"
              className={primaryBtn}
              disabled={!canGenerate || generating}
              onClick={handleGenerate}
            >
              {generating ? "Rédaction en cours…" : draft ? "Régénérer la lettre" : "Générer la lettre"}
            </button>
          </div>

          {generating && <p className="text-sm text-gray-500">Cela prend généralement 10 à 20 secondes.</p>}
          {!canGenerate && !generating && (
            <p className="text-xs text-gray-500">Relancez l'analyse de l'offre avant de générer.</p>
          )}
          {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          {/* Lettre modifiable */}
          {draft && (
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600">Objet</span>
                <input
                  value={draft.subject}
                  disabled={generating}
                  onChange={(e) => onDraftChange({ ...draft, subject: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600">
                  Texte (séparez les paragraphes par une ligne vide)
                </span>
                <textarea
                  value={draft.body}
                  rows={18}
                  disabled={generating}
                  onChange={(e) => onDraftChange({ ...draft, body: e.target.value })}
                  className={`${inputCls} resize-y leading-relaxed`}
                />
              </label>

              <LetterChecks checks={checks} />

              <div className="flex flex-wrap gap-2">
                <button type="button" className={primaryBtn} disabled={downloading} onClick={handleDownload}>
                  {downloading ? "Génération…" : "Télécharger le PDF"}
                </button>
                <button type="button" className={btn} onClick={handleCopy}>
                  {copied ? "Copié !" : "Copier le texte"}
                </button>
                <button
                  type="button"
                  className={`${btn} border-red-300 text-red-700 hover:bg-red-50`}
                  onClick={handleClear}
                >
                  Effacer
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function LetterChecks({ checks }: { checks: Check[] }) {
  const errors = checks.filter((c) => c.level === "error");
  const warnings = checks.filter((c) => c.level === "warning");
  const infos = checks.filter((c) => c.level === "info");

  return (
    <div className="space-y-2">
      {errors.length === 0 ? (
        <p className="rounded bg-green-50 p-3 text-sm text-green-800">
          Aucun chiffre inventé ni information à compléter.
        </p>
      ) : (
        <div className="rounded bg-red-50 p-3 text-sm text-red-800">
          <p className="font-medium">À corriger avant d'envoyer ({errors.length})</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {errors.map((c, i) => (
              <li key={i}>{c.message}</li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="rounded bg-amber-50 p-3 text-sm text-amber-800">
          <ul className="list-disc space-y-1 pl-5">
            {warnings.map((c, i) => (
              <li key={i}>{c.message}</li>
            ))}
          </ul>
        </div>
      )}
      {infos.map((c, i) => (
        <p key={i} className="text-xs text-gray-500">
          {c.message}
        </p>
      ))}
    </div>
  );
}