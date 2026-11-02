import type { MasterCv, OfferAnalysis, OfferKeyword } from "./schemas.js";
// Ce fichier n'importe que des types : il est utilisé à la fois par le navigateur et par api/.

export const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Le terme apparaît-il comme mot entier dans le texte ? (texte et terme déjà normalisés) */
export function containsTerm(text: string, term: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}($|[^a-z0-9])`).test(text);
}

const period = (start: string | null, end: string | null) =>
  `${start ?? "?"} → ${end === null ? "aujourd'hui" : end || "?"}`;

/** CV au format texte, avec les identifiants entre crochets, pour le prompt. */
export function cvToPromptText(cv: MasterCv): string {
  const lines: string[] = [];

  if (cv.contact.headline) lines.push(`[headline] ${cv.contact.headline}`);
  if (cv.summary) lines.push(`[summary] ${cv.summary}`);

  for (const e of cv.experiences) {
    lines.push(`[${e.id}] ${e.jobTitle}${e.company ? ` — ${e.company}` : ""} (${period(e.startDate, e.endDate)})`);
    for (const b of e.bullets) if (b.text.trim()) lines.push(`  [${b.id}] ${b.text}`);
    if (e.tools.length) lines.push(`  Outils : ${e.tools.join(", ")}`);
  }

  for (const p of cv.projects) {
    lines.push(`[${p.id}] Projet : ${p.name}${p.context ? ` (${p.context})` : ""}`);
    for (const b of p.bullets) if (b.text.trim()) lines.push(`  [${b.id}] ${b.text}`);
    if (p.tools.length) lines.push(`  Outils : ${p.tools.join(", ")}`);
  }

  for (const ed of cv.education) {
    lines.push(
      `[${ed.id}] ${ed.degree}${ed.school ? ` — ${ed.school}` : ""}${ed.details ? ` (${ed.details})` : ""}`,
    );
  }
  for (const c of cv.certifications) lines.push(`[${c.id}] Certification : ${c.name}`);

  if (cv.skills.length) {
    lines.push("[skills]");
    for (const g of cv.skills) lines.push(`  ${g.category} : ${g.items.join(", ")}`);
  }
  if (cv.languages.length) {
    lines.push(`[languages] ${cv.languages.map((l) => [l.language, l.level].filter(Boolean).join(" ")).join(", ")}`);
  }

  return lines.join("\n");
}

/** Texte du CV sans les identifiants, pour les recherches de mots et de chiffres. */
export function cvPlainText(cv: MasterCv): string {
  return cvToPromptText(cv).replace(/\[[^\]]+\]/g, " ");
}

function collectIds(cv: MasterCv): Set<string> {
  const ids = new Set<string>(["headline", "summary", "skills", "languages"]);
  for (const e of cv.experiences) {
    ids.add(e.id);
    e.bullets.forEach((b) => ids.add(b.id));
  }
  for (const p of cv.projects) {
    ids.add(p.id);
    p.bullets.forEach((b) => ids.add(b.id));
  }
  cv.education.forEach((e) => ids.add(e.id));
  cv.certifications.forEach((c) => ids.add(c.id));
  return ids;
}

/**
 * Vérifie et corrige le classement de l'IA :
 * - "present" seulement si le terme figure réellement dans le CV ;
 * - "defensible" seulement avec au moins une source valide ;
 * - suppression des doublons et des sources inventées.
 */
export function reconcileAnalysis(cv: MasterCv, analysis: OfferAnalysis): OfferAnalysis {
  const cvText = normalize(cvToPromptText(cv).replace(/\[[^\]]+\]/g, " "));
  const validIds = collectIds(cv);
  const seen = new Set<string>();
  const keywords: OfferKeyword[] = [];

  for (const k of analysis.keywords) {
    const key = normalize(k.term);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const evidenceIds = k.evidenceIds.filter((id) => validIds.has(id));
    let status = k.status;

    if (containsTerm(cvText, key)) status = "present";
    else if (status === "present") status = evidenceIds.length ? "defensible" : "missing";
    else if (status === "defensible" && evidenceIds.length === 0) status = "missing";

    keywords.push({
      ...k,
      term: k.term.trim(),
      status,
      evidenceIds,
      suggestion: status === "defensible" ? k.suggestion : null,
    });
  }

  return { ...analysis, keywords };
}

/** Libellé lisible d'une source ("exp-2-b1" → "Développeur Full Stack Freelance — Radif Analysis"). */
export function describeSource(cv: MasterCv, id: string): string {
  const parentId = id.replace(/-b\d+$/, "");
  const exp = cv.experiences.find((e) => e.id === parentId);
  if (exp) return [exp.jobTitle, exp.company].filter(Boolean).join(" — ");
  const prj = cv.projects.find((p) => p.id === parentId);
  if (prj) return `Projet ${prj.name}`;
  const edu = cv.education.find((e) => e.id === id);
  if (edu) return edu.degree;
  const cert = cv.certifications.find((c) => c.id === id);
  if (cert) return cert.name;
  const fixed: Record<string, string> = {
    headline: "Titre",
    summary: "Profil",
    skills: "Compétences",
    languages: "Langues",
  };
  return fixed[id] ?? id;
}

/** Empreinte courte d'une valeur, pour savoir si le CV ou l'offre ont changé depuis l'analyse. */
export function fingerprint(value: unknown): string {
  const str = JSON.stringify(value);
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}