import { z } from "zod";

// Contraintes pour les Structured Outputs d'OpenAI :
// pas de .optional() (utiliser .nullable()), pas de .min()/.max().
// Les règles de longueur sont vérifiées à part, dans le code.

const nullableString = z.string().nullable();

// ---------- Briques communes ----------
export const ContactSchema = z.object({
  fullName: z.string(),
  headline: nullableString,
  email: nullableString,
  phone: nullableString,
  location: nullableString,
  links: z.array(z.object({ label: z.string(), url: z.string() })),
});

const ExperienceBase = z.object({
  jobTitle: z.string(),
  company: nullableString,
  location: nullableString,
  startDate: nullableString, // "AAAA-MM" ou "AAAA"
  endDate: nullableString,   // null = poste actuel
  bullets: z.array(z.string()),
  tools: z.array(z.string()),
});

const ProjectBase = z.object({
  name: z.string(),
  context: nullableString,
  date: nullableString,
  url: nullableString,
  bullets: z.array(z.string()),
  tools: z.array(z.string()),
});

const EducationBase = z.object({
  degree: z.string(),
  school: nullableString,
  location: nullableString,
  startDate: nullableString,
  endDate: nullableString,
  details: nullableString,
});

const CertificationBase = z.object({
  name: z.string(),
  issuer: nullableString,
  date: nullableString,
});

const LanguageBase = z.object({
  language: z.string(),
  level: nullableString,
});

const SkillGroupSchema = z.object({
  category: z.string(),
  items: z.array(z.string()),
});

// ---------- 1. CV extrait (sortie IA, sans identifiants) ----------
export const ExtractedCvSchema = z.object({
  contact: ContactSchema,
  summary: nullableString,
  experiences: z.array(ExperienceBase),
  projects: z.array(ProjectBase),
  education: z.array(EducationBase),
  certifications: z.array(CertificationBase),
  languages: z.array(LanguageBase),
  skills: z.array(SkillGroupSchema),
  interests: z.array(z.string()),
});

// ---------- 2. CV maître (identifiants attribués par le code) ----------
const BulletSchema = z.object({ id: z.string(), text: z.string() });

export const MasterExperienceSchema = ExperienceBase.extend({
  id: z.string(),
  bullets: z.array(BulletSchema),
});
export const MasterProjectSchema = ProjectBase.extend({
  id: z.string(),
  bullets: z.array(BulletSchema),
});
export const MasterEducationSchema = EducationBase.extend({ id: z.string() });
export const MasterCertificationSchema = CertificationBase.extend({ id: z.string() });
export const MasterLanguageSchema = LanguageBase.extend({ id: z.string() });

export const MasterCvSchema = z.object({
  contact: ContactSchema,
  summary: nullableString,
  experiences: z.array(MasterExperienceSchema),
  projects: z.array(MasterProjectSchema),
  education: z.array(MasterEducationSchema),
  certifications: z.array(MasterCertificationSchema),
  languages: z.array(MasterLanguageSchema),
  skills: z.array(SkillGroupSchema),
  interests: z.array(z.string()),
});

// ---------- 3. Analyse de l'offre et comparaison avec le CV (sortie IA) ----------
export const OfferKeywordSchema = z.object({
  term: z.string(),                                           // mot exact de l'offre
  category: z.enum(["skill", "tool", "quality", "degree"]),
  status: z.enum(["present", "defensible", "missing"]),
  evidenceIds: z.array(z.string()),                           // éléments du CV qui le justifient
  justification: z.string(),
  suggestion: nullableString,                                 // où l'ajouter (si "defensible")
});

export const OfferAnalysisSchema = z.object({
  jobTitle: z.string(),                                       // intitulé exact du poste
  company: nullableString,
  language: z.enum(["fr", "en"]),
  keywords: z.array(OfferKeywordSchema),
});

// ---------- 4. CV adapté (sortie IA) ----------
const TailoredBulletSchema = z.object({
  sourceIds: z.array(z.string()),
  text: z.string(),
});

// ---------- 5. Lettre de motivation (sortie IA) ----------
export const CoverLetterSchema = z.object({
  subject: z.string(),
  greeting: z.string(),
  paragraphs: z.array(z.string()),
  closing: z.string(),
});

const TailoredItemSchema = z.object({
  sourceId: z.string(),
  bullets: z.array(TailoredBulletSchema),
});

export const TailoredCvSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  experiences: z.array(TailoredItemSchema),
  projects: z.array(TailoredItemSchema),
  skills: z.array(SkillGroupSchema),
});

// ---------- Types ----------
export type Contact = z.infer<typeof ContactSchema>;
export type ExtractedCv = z.infer<typeof ExtractedCvSchema>;
export type MasterCv = z.infer<typeof MasterCvSchema>;
export type MasterExperience = z.infer<typeof MasterExperienceSchema>;
export type MasterProject = z.infer<typeof MasterProjectSchema>;
export type OfferKeyword = z.infer<typeof OfferKeywordSchema>;
export type OfferAnalysis = z.infer<typeof OfferAnalysisSchema>;
export type TailoredCv = z.infer<typeof TailoredCvSchema>;
export type CoverLetter = z.infer<typeof CoverLetterSchema>;