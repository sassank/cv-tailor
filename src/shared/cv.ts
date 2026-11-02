import type {
  Contact,
  ExtractedCv,
  MasterCv,
  MasterExperience,
  MasterProject,
  TailoredCv,
} from "./schemas.js";

// Ce fichier n'importe que des types : il est utilisé à la fois par le navigateur et par api/.

/** Attribue des identifiants stables après l'extraction. */
export function toMasterCv(raw: ExtractedCv): MasterCv {
  return {
    contact: raw.contact,
    summary: raw.summary,
    experiences: raw.experiences.map((e, i) => ({
      ...e,
      id: `exp-${i + 1}`,
      bullets: e.bullets.map((text, j) => ({ id: `exp-${i + 1}-b${j + 1}`, text })),
    })),
    projects: raw.projects.map((p, i) => ({
      ...p,
      id: `prj-${i + 1}`,
      bullets: p.bullets.map((text, j) => ({ id: `prj-${i + 1}-b${j + 1}`, text })),
    })),
    education: raw.education.map((e, i) => ({ ...e, id: `edu-${i + 1}` })),
    certifications: raw.certifications.map((c, i) => ({ ...c, id: `cert-${i + 1}` })),
    languages: raw.languages.map((l, i) => ({ ...l, id: `lang-${i + 1}` })),
    skills: raw.skills,
    interests: raw.interests,
  };
}

type WithTextBullets<T> = Omit<T, "bullets"> & { bullets: string[] };

/** CV prêt à afficher : champs factuels recopiés, textes éventuellement reformulés. */
export type ResolvedCv = {
  contact: Contact;
  headline: string;
  summary: string;
  experiences: WithTextBullets<MasterExperience>[];
  projects: WithTextBullets<MasterProject>[];
  skills: { category: string; items: string[] }[];
  education: MasterCv["education"];
  certifications: MasterCv["certifications"];
  languages: MasterCv["languages"];
  interests: string[];
};

export const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

type TailoredBullets = TailoredCv["experiences"][number]["bullets"];

/**
 * Fusionne le CV de base et la proposition de l'IA :
 * - champs factuels (postes, entreprises, dates, diplômes) toujours recopiés du CV ;
 * - toutes les expériences conservées, dans l'ordre du CV ;
 * - puces sans source valide et compétences inconnues retirées.
 */
export function resolveTailoredCv(
  master: MasterCv,
  tailored: TailoredCv,
  options: { headline: string; extraSkills?: string[] },
) {
  const errors: string[] = [];

  const resolveBullets = (source: MasterExperience | MasterProject, bullets: TailoredBullets) => {
    const validIds = new Set(source.bullets.map((b) => b.id));
    return bullets
      .filter((b) => {
        const ok = b.text.trim() !== "" && b.sourceIds.length > 0 && b.sourceIds.every((id) => validIds.has(id));
        if (!ok) errors.push(`Puce retirée (source invalide) : « ${b.text} »`);
        return ok;
      })
      .map((b) => b.text.trim());
  };

  // Expériences : toutes, dans l'ordre du CV (pas de trou dans le parcours)
  const tailoredExp = new Map(tailored.experiences.map((e) => [e.sourceId, e]));
  for (const t of tailored.experiences) {
    if (!master.experiences.some((e) => e.id === t.sourceId)) {
      errors.push(`Expérience inconnue ignorée : ${t.sourceId}`);
    }
  }
  const experiences = master.experiences.map((exp) => {
    const t = tailoredExp.get(exp.id);
    return { ...exp, bullets: t ? resolveBullets(exp, t.bullets) : [] };
  });

  // Projets : sélection et ordre proposés par l'IA
  const projectsById = new Map(master.projects.map((p) => [p.id, p]));
  const seenProjects = new Set<string>();
  const projects: WithTextBullets<MasterProject>[] = [];
  for (const t of tailored.projects) {
    const source = projectsById.get(t.sourceId);
    if (!source) {
      errors.push(`Projet inconnu ignoré : ${t.sourceId}`);
      continue;
    }
    if (seenProjects.has(source.id)) continue;
    seenProjects.add(source.id);
    projects.push({ ...source, bullets: resolveBullets(source, t.bullets) });
  }

  // Compétences : celles du CV, les outils cités, et les mots-clés validés
  const knownSkills = new Set(
    [
      ...master.skills.flatMap((g) => g.items),
      ...master.experiences.flatMap((e) => e.tools),
      ...master.projects.flatMap((p) => p.tools),
      ...(options.extraSkills ?? []),
    ].map(normalize),
  );
  const skills = tailored.skills
    .map((group) => ({
      category: group.category,
      items: group.items.filter((item) => {
        const ok = knownSkills.has(normalize(item));
        if (!ok) errors.push(`Compétence retirée (absente de votre CV) : « ${item} »`);
        return ok;
      }),
    }))
    .filter((g) => g.items.length > 0);

  const cv: ResolvedCv = {
    contact: master.contact,
    headline: options.headline,
    summary: tailored.summary.trim(),
    experiences,
    projects,
    skills,
    education: master.education,
    certifications: master.certifications,
    languages: master.languages,
    interests: master.interests,
  };

  return { cv, errors };
}

/** CV de base → format de rendu (sans adaptation), en ignorant les éléments vides. */
export function masterToResolved(master: MasterCv): ResolvedCv {
  const texts = (bullets: { text: string }[]) => bullets.map((b) => b.text.trim()).filter(Boolean);

  return {
    contact: master.contact,
    headline: master.contact.headline ?? "",
    summary: master.summary ?? "",
    experiences: master.experiences.map((e) => ({ ...e, bullets: texts(e.bullets) })),
    projects: master.projects.map((p) => ({ ...p, bullets: texts(p.bullets) })),
    skills: master.skills.filter((g) => g.items.length > 0),
    education: master.education,
    certifications: master.certifications,
    languages: master.languages,
    interests: master.interests,
  };
}