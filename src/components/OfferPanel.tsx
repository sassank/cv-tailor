import { useState, type ReactNode } from "react";
import { analyzeOffer, tailorCv } from "../lib/api";
import { clearOffer, EMPTY_OFFER, loadOffer, saveOffer, type SavedOffer } from "../lib/storage";
import { describeSource, fingerprint } from "../shared/analysis";
import type { MasterCv, OfferAnalysis, OfferKeyword } from "../shared/schemas";
import { TailoredResult } from "./TailoredResult";
import { LetterPanel } from "./LetterPanel";
import { cleanJobTitle } from "../shared/tailor";

const MIN_OFFER = 200;

const CATEGORY_LABEL: Record<OfferKeyword["category"], string> = {
  skill: "Compétence",
  tool: "Outil",
  quality: "Qualité",
  degree: "Diplôme",
};

const btn = "rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50";
const primaryBtn = "rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50";

const toMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function OfferPanel({ cv }: { cv: MasterCv }) {
  const [state, setState] = useState<SavedOffer>(() => loadOffer());
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

    function update(patch: Partial<SavedOffer>) {
    setState((prev) => {
      const next = { ...prev, ...patch };
      try {
        saveOffer(next);
      } catch {
        // Stockage indisponible : l'état reste en mémoire
      }
      return next;
    });
  }

  const busy = loading || generating;
  const offerText = state.offerText.trim();

  const analysisStale =
    state.analysis !== null &&
    (state.analyzedFor?.cv !== fingerprint(cv) || state.analyzedFor?.offer !== fingerprint(offerText));

  const tailorFingerprint = state.analysis
    ? fingerprint({ cv, analysis: state.analysis, accepted: [...state.accepted].sort(), maxPages: state.maxPages })
    : null;
  const tailoredStale = state.tailored !== null && state.tailoredFor !== tailorFingerprint;

  async function handleAnalyze() {
    setError(null);
    setLoading(true);
    try {
      const analysis = await analyzeOffer(cv, offerText);
      // On garde les choix déjà faits sur les mots-clés toujours "défendables"
      const defensible = new Set(analysis.keywords.filter((k) => k.status === "defensible").map((k) => k.term));
      update({
        analysis,
        accepted: state.accepted.filter((t) => defensible.has(t)),
        analyzedFor: { cv: fingerprint(cv), offer: fingerprint(offerText) },
      });
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!state.analysis) return;
    setGenError(null);
    setGenerating(true);
    try {
      const tailored = await tailorCv({
        cv,
        analysis: state.analysis,
        accepted: state.accepted,
        offerText,
        maxPages: state.maxPages,
      });
      update({ tailored, tailoredFor: tailorFingerprint });
    } catch (e) {
      setGenError(toMessage(e));
    } finally {
      setGenerating(false);
    }
  }

  function handleReset() {
    if (!window.confirm("Effacer cette offre, son analyse et le CV adapté ?")) return;
    clearOffer();
    setState(EMPTY_OFFER);
    setError(null);
    setGenError(null);
  }

  function toggle(term: string) {
    update({
      accepted: state.accepted.includes(term)
        ? state.accepted.filter((t) => t !== term)
        : [...state.accepted, term],
    });
  }

  return (
    <div className="space-y-6">
      {/* Saisie de l'offre */}
      <section className="space-y-3 rounded-lg border border-gray-200 p-4">
        <div>
          <h2 className="font-medium">Collez l'offre d'emploi</h2>
          <p className="text-sm text-gray-600">
            Copiez le texte complet de l'annonce : intitulé, missions, profil recherché.
          </p>
        </div>

        <textarea
          value={state.offerText}
          rows={12}
          disabled={busy}
          onChange={(e) => update({ offerText: e.target.value })}
          placeholder="Collez ici le texte de l'annonce…"
          className="w-full resize-y rounded border border-gray-300 p-3 text-sm focus:border-gray-900 focus:outline-none disabled:bg-gray-50"
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={primaryBtn}
            disabled={busy || offerText.length < MIN_OFFER}
            onClick={handleAnalyze}
          >
            {loading ? "Analyse en cours…" : state.analysis ? "Relancer l'analyse" : "Analyser l'offre"}
          </button>
          {state.offerText && (
            <button type="button" className={btn} disabled={busy} onClick={handleReset}>
              Nouvelle offre
            </button>
          )}
          <span className="text-xs text-gray-500">
            {offerText.length < MIN_OFFER
              ? `${offerText.length} / ${MIN_OFFER} caractères minimum`
              : `${offerText.length} caractères`}
          </span>
        </div>

        {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {analysisStale && !loading && (
          <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">
            Votre CV ou l'offre a changé depuis l'analyse. Relancez-la pour être à jour.
          </p>
        )}
      </section>

      {state.analysis && (
        <KeywordReview
          cv={cv}
          analysis={state.analysis}
          accepted={state.accepted}
          onToggle={toggle}
          maxPages={state.maxPages}
          onMaxPagesChange={(maxPages) => update({ maxPages })}
          onGenerate={handleGenerate}
          generating={generating}
          canGenerate={!analysisStale && !loading}
          hasResult={state.tailored !== null}
          genError={genError}
        />
      )}

      {state.analysis && state.tailored && !generating && (
        <TailoredResult
          master={cv}
          analysis={state.analysis}
          accepted={state.accepted}
          tailored={state.tailored}
          maxPages={state.maxPages}
          stale={tailoredStale}
        />
      )}

      {state.analysis && (
        <LetterPanel
          cv={cv}
          analysis={state.analysis}
          accepted={state.accepted}
          offerText={offerText}
          draft={state.letterDraft}
          canGenerate={!analysisStale && !busy}
          onDraftChange={(letterDraft) => update({ letterDraft })}
        />
      )}
      
    </div>
  );
}

/* ---------- Résultat de l'analyse ---------- */

function KeywordReview({
  cv,
  analysis,
  accepted,
  onToggle,
  maxPages,
  onMaxPagesChange,
  onGenerate,
  generating,
  canGenerate,
  hasResult,
  genError,
}: {
  cv: MasterCv;
  analysis: OfferAnalysis;
  accepted: string[];
  onToggle: (term: string) => void;
  maxPages: 1 | 2;
  onMaxPagesChange: (maxPages: 1 | 2) => void;
  onGenerate: () => void;
  generating: boolean;
  canGenerate: boolean;
  hasResult: boolean;
  genError: string | null;
}) {
  const present = analysis.keywords.filter((k) => k.status === "present");
  const defensible = analysis.keywords.filter((k) => k.status === "defensible");
  const missing = analysis.keywords.filter((k) => k.status === "missing");
  const acceptedCount = defensible.filter((k) => accepted.includes(k.term)).length;
  const covered = present.length + acceptedCount;

  return (
    <section className="space-y-6 rounded-lg border border-gray-200 p-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Titre de votre CV</p>
        <p className="text-lg font-semibold">
          {cleanJobTitle(analysis.jobTitle)}
          {analysis.company && <span className="font-normal text-gray-500"> · {analysis.company}</span>}
        </p>
        {cleanJobTitle(analysis.jobTitle) !== analysis.jobTitle.trim() && (
          <p className="text-sm text-gray-500">Intitulé dans l'offre : {analysis.jobTitle}</p>
        )}
      </div>

      <Group title="Déjà dans votre CV" count={present.length}>
        <ul className="flex flex-wrap gap-2">
          {present.map((k) => (
            <Chip key={k.term} keyword={k} tone="green" />
          ))}
        </ul>
      </Group>

      <Group
        title="Absents, mais votre expérience permet de les affirmer"
        count={defensible.length}
        description="Cochez uniquement ceux que vous pourriez défendre en entretien. Les autres ne seront pas utilisés."
      >
        <div className="space-y-2">
          {defensible.map((k) => (
            <label
              key={k.term}
              className="flex cursor-pointer gap-3 rounded border border-gray-200 p-3 hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={accepted.includes(k.term)}
                disabled={generating}
                onChange={() => onToggle(k.term)}
                className="mt-1"
              />
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">{k.term}</span>{" "}
                  <span className="text-xs text-gray-500">· {CATEGORY_LABEL[k.category]}</span>
                </p>
                <p className="text-gray-600">{k.justification}</p>
                {k.suggestion && <p className="text-gray-800">→ {k.suggestion}</p>}
                {k.evidenceIds.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Source : {[...new Set(k.evidenceIds.map((id) => describeSource(cv, id)))].join(", ")}
                  </p>
                )}
              </div>
            </label>
          ))}
        </div>
      </Group>

      <Group
        title="Absents, et non justifiables"
        count={missing.length}
        description="Ils ne seront pas utilisés. Si l'un d'eux est vrai pour vous, ajoutez-le d'abord à votre CV de base (onglet « Mon CV »)."
      >
        <ul className="flex flex-wrap gap-2">
          {missing.map((k) => (
            <Chip key={k.term} keyword={k} tone="gray" />
          ))}
        </ul>
      </Group>

      {/* Génération */}
      <div className="space-y-3 border-t border-gray-200 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-700">
            Mots-clés couverts : <span className="font-semibold">{covered}</span> / {analysis.keywords.length}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-gray-700">
              Longueur visée{" "}
              <select
                value={maxPages}
                disabled={generating}
                onChange={(e) => onMaxPagesChange(Number(e.target.value) as 1 | 2)}
                className="ml-1 rounded border border-gray-300 px-2 py-1 text-sm"
              >
                <option value={1}>1 page</option>
                <option value={2}>2 pages maximum</option>
              </select>
            </label>
            <button type="button" className={primaryBtn} disabled={!canGenerate || generating} onClick={onGenerate}>
              {generating ? "Rédaction en cours…" : hasResult ? "Régénérer le CV adapté" : "Générer le CV adapté →"}
            </button>
          </div>
        </div>
        {generating && <p className="text-sm text-gray-500">Cela prend généralement 10 à 30 secondes.</p>}
        {!canGenerate && !generating && (
          <p className="text-xs text-gray-500">Relancez l'analyse avant de générer.</p>
        )}
        {genError && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{genError}</p>}
      </div>
    </section>
  );
}

function Group({
  title,
  count,
  description,
  children,
}: {
  title: string;
  count: number;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="font-medium">
        {title} <span className="text-sm font-normal text-gray-500">({count})</span>
      </h3>
      {description && <p className="text-sm text-gray-600">{description}</p>}
      {count === 0 ? <p className="text-sm text-gray-400">Aucun.</p> : children}
    </div>
  );
}

function Chip({ keyword, tone }: { keyword: OfferKeyword; tone: "green" | "gray" }) {
  const cls =
    tone === "green"
      ? "border-green-200 bg-green-50 text-green-800"
      : "border-gray-200 bg-gray-50 text-gray-500";
  return (
    <li title={keyword.justification} className={`rounded border px-2 py-1 text-sm ${cls}`}>
      {keyword.term} <span className="text-xs opacity-70">· {CATEGORY_LABEL[keyword.category]}</span>
    </li>
  );
}