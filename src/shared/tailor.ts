import type { MasterCv, OfferAnalysis, TailoredCv } from "./schemas";
import { resolveTailoredCv, type ResolvedCv } from "./cv";
import { containsTerm, cvPlainText, normalize } from "./analysis";

// Utilisé uniquement côté navigateur.

export type Check = { level: "error" | "warning" | "info"; message: string };
export type TailoringResult = { cv: ResolvedCv; checks: Check[] };

// Détecte "[À COMPLÉTER]" comme "[À COMPLÉTER : pourquoi cette entreprise]"
export const PLACEHOLDER_RE = /\[\s*[àa]\s*compl[ée]ter[^\]]*\]/i;
const NUMBER_RE = /\d+(?:[.,]\d+)?/g;

export const numbersIn = (text: string) =>
  new Set((text.match(NUMBER_RE) ?? []).map((n) => n.replace(",", ".")));

/** "Développeur Full Stack (H/F)" → "Développeur Full Stack" */
export function cleanJobTitle(title: string): string {
  return title
    .replace(/\(?\s*\b[hf]\s*\/\s*[hf](\s*\/\s*[xn])?\b\s*\)?/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s\-–—|,]+$/, "")
    .trim();
}

export function buildTailoredCv(
  master: MasterCv,
  analysis: OfferAnalysis,
  accepted: string[],
  tailored: TailoredCv,
): TailoringResult {
  const acceptedTerms = analysis.keywords
    .filter((k) => k.status === "defensible" && accepted.includes(k.term))
    .map((k) => k.term);

  const { cv, errors } = resolveTailoredCv(master, tailored, {
    headline: cleanJobTitle(analysis.jobTitle),
    extraSkills: acceptedTerms,
  });

  const checks: Check[] = errors.map((message) => ({ level: "warning", message }));

  const sourceText = cvPlainText(master);
  const sourceNumbers = numbersIn(sourceText);
  const sourceNorm = normalize(sourceText);

  const generated = [
    { label: "Profil", text: cv.summary },
    ...cv.experiences.flatMap((e) => e.bullets.map((text) => ({ label: e.jobTitle, text }))),
    ...cv.projects.flatMap((p) => p.bullets.map((text) => ({ label: `Projet ${p.name}`, text }))),
  ];

  // 1. Chiffres absents du CV d'origine
  for (const { label, text } of generated) {
    for (const n of numbersIn(text)) {
      if (!sourceNumbers.has(n)) {
        checks.push({ level: "error", message: `Chiffre absent de votre CV : « ${n} » (${label}) — « ${text} »` });
      }
    }
  }

  // 2. Mots-clés non validés utilisés quand même
  const generatedNorm = normalize(generated.map((g) => g.text).join(" \n "));
  const forbidden = analysis.keywords.filter(
    (k) => k.status === "missing" || (k.status === "defensible" && !accepted.includes(k.term)),
  );
  for (const k of forbidden) {
    const term = normalize(k.term);
    if (containsTerm(generatedNorm, term) && !containsTerm(sourceNorm, term)) {
      checks.push({ level: "error", message: `Mot-clé non validé utilisé : « ${k.term} »` });
    }
  }

  // 3. Informations à compléter
  for (const { label, text } of generated) {
    if (PLACEHOLDER_RE.test(text)) {
      checks.push({ level: "error", message: `À compléter avant envoi (${label}) : « ${text} »` });
    }
  }

  checks.push({ level: "info", message: `Titre du CV : « ${cv.headline} » (intitulé exact de l'offre).` });

  return { cv, checks };
}