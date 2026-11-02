import {
  MasterCvSchema,
  OfferAnalysisSchema,
  TailoredCvSchema,
  type MasterCv,
  type OfferAnalysis,
  type TailoredCv,
} from "../shared/schemas";
import type { LetterDraft } from "../shared/letter";

// Changez la version si le schéma évolue de façon incompatible
const STORAGE_KEY = "cv-tailor:master-cv:v1";

export type SavedCv = { savedAt: string; cv: MasterCv };

/** Charge le CV maître enregistré. Retourne null si absent ou illisible. */
export function loadMasterCv(): SavedCv | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return { savedAt: String(data.savedAt), cv: MasterCvSchema.parse(data.cv) };
  } catch (e) {
    console.warn("Sauvegarde illisible, ignorée.", e);
    return null;
  }
}

/** Enregistre le CV maître et retourne la date d'enregistrement. */
export function saveMasterCv(cv: MasterCv): string {
  const savedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt, cv }));
  return savedAt;
}

export function clearMasterCv(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Télécharge le CV maître en fichier JSON (copie de secours). */
export function downloadMasterCv(cv: MasterCv): void {
  const blob = new Blob([JSON.stringify(cv, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cv-tailor-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Lit et valide un fichier JSON de CV maître. */
export async function readMasterCvFile(file: File): Promise<MasterCv> {
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error("Fichier JSON invalide.");
  }
  const result = MasterCvSchema.safeParse(data);
  if (!result.success) {
    throw new Error("Ce fichier ne correspond pas au format d'un CV maître.");
  }
  return result.data;
}

/* ---------- Offre en cours ---------- */

const OFFER_KEY = "cv-tailor:offer:v1";

export type SavedOffer = {
  offerText: string;
  analysis: OfferAnalysis | null;
  accepted: string[]; // mots-clés "défendables" cochés par l'utilisateur
  analyzedFor: { cv: string; offer: string } | null; // empreintes au moment de l'analyse
  maxPages: 1 | 2;
  tailored: TailoredCv | null; // dernière proposition de l'IA
  tailoredFor: string | null; // empreinte au moment de la génération
  letterDraft: LetterDraft | null;
};

export const EMPTY_OFFER: SavedOffer = {
  offerText: "",
  analysis: null,
  accepted: [],
  analyzedFor: null,
  maxPages: 1,
  tailored: null,
  tailoredFor: null,
  letterDraft: null,
};

export function loadOffer(): SavedOffer {
  try {
    const raw = localStorage.getItem(OFFER_KEY);
    if (!raw) return EMPTY_OFFER;
    const data = JSON.parse(raw);
    const analyzedFor =
      data.analyzedFor && typeof data.analyzedFor.cv === "string" && typeof data.analyzedFor.offer === "string"
        ? { cv: data.analyzedFor.cv, offer: data.analyzedFor.offer }
        : null;
    return {
      offerText: typeof data.offerText === "string" ? data.offerText : "",
      analysis: data.analysis ? OfferAnalysisSchema.parse(data.analysis) : null,
      accepted: Array.isArray(data.accepted)
        ? data.accepted.filter((t: unknown): t is string => typeof t === "string")
        : [],
      analyzedFor,
      maxPages: data.maxPages === 2 ? 2 : 1,
      tailored: data.tailored ? TailoredCvSchema.parse(data.tailored) : null,
      tailoredFor: typeof data.tailoredFor === "string" ? data.tailoredFor : null,
      letterDraft:
        data.letterDraft &&
        typeof data.letterDraft.subject === "string" &&
        typeof data.letterDraft.body === "string"
          ? { subject: data.letterDraft.subject, body: data.letterDraft.body }
          : null,
    };
  } catch (e) {
    console.warn("Offre enregistrée illisible, ignorée.", e);
    return EMPTY_OFFER;
  }
}

export function saveOffer(offer: SavedOffer): void {
  localStorage.setItem(OFFER_KEY, JSON.stringify(offer));
}

export function clearOffer(): void {
  localStorage.removeItem(OFFER_KEY);
}