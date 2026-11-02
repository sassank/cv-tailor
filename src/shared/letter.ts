import type { CoverLetter, MasterCv, OfferAnalysis } from "./schemas";
import { containsTerm, cvPlainText, normalize } from "./analysis";
import { numbersIn, PLACEHOLDER_RE, type Check } from "./tailor";

// Utilisé uniquement côté navigateur.

export type LetterDraft = { subject: string; body: string };

/** Lettre générée → texte modifiable (paragraphes séparés par une ligne vide). */
export function letterToDraft(letter: CoverLetter): LetterDraft {
  return {
    subject: letter.subject.trim(),
    body: [letter.greeting, ...letter.paragraphs, letter.closing]
      .map((p) => p.trim())
      .filter(Boolean)
      .join("\n\n"),
  };
}

/** Vérifie la lettre, y compris après vos modifications. */
export function checkLetter(
  master: MasterCv,
  analysis: OfferAnalysis,
  accepted: string[],
  offerText: string,
  draft: LetterDraft,
): Check[] {
  const checks: Check[] = [];
  const text = `${draft.subject}\n${draft.body}`;
  const cvText = cvPlainText(master);

  // 1. Chiffres absents du CV et de l'offre
  const sourceNumbers = numbersIn(`${cvText}\n${offerText}`);
  for (const n of numbersIn(text)) {
    if (!sourceNumbers.has(n)) {
      checks.push({ level: "error", message: `Chiffre absent de votre CV et de l'offre : « ${n} »` });
    }
  }

  // 2. Mots-clés non validés (acceptables seulement s'ils ne sont pas présentés comme acquis)
  const textNorm = normalize(text);
  const cvNorm = normalize(cvText);
  const forbidden = analysis.keywords.filter(
    (k) => k.status === "missing" || (k.status === "defensible" && !accepted.includes(k.term)),
  );
  for (const k of forbidden) {
    const term = normalize(k.term);
    if (containsTerm(textNorm, term) && !containsTerm(cvNorm, term)) {
      checks.push({
        level: "warning",
        message: `« ${k.term} » n'est pas validé : vérifiez qu'il n'est pas présenté comme une compétence acquise.`,
      });
    }
  }

  // 3. Marqueurs à compléter
  for (const paragraph of draft.body.split(/\n\s*\n/)) {
    if (PLACEHOLDER_RE.test(paragraph)) {
      checks.push({ level: "error", message: `À compléter : « ${paragraph.trim()} »` });
    }
  }

  const words = draft.body.trim().split(/\s+/).filter(Boolean).length;
  checks.push({ level: "info", message: `${words} mots.` });

  return checks;
}