import {
  CoverLetterSchema,
  MasterCvSchema,
  OfferAnalysisSchema,
  TailoredCvSchema,
  type CoverLetter,
  type MasterCv,
  type OfferAnalysis,
  type TailoredCv,
} from "../shared/schemas";

const PASSWORD_KEY = "cv-tailor:password";

function getPassword(): string {
  try {
    return localStorage.getItem(PASSWORD_KEY) ?? "";
  } catch {
    return "";
  }
}

async function postJson(url: string, body: unknown, retry = true): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-App-Password": getPassword() },
    body: JSON.stringify(body),
  });

  // Mot de passe manquant ou incorrect : on le demande une fois, puis on réessaie
  if (res.status === 401 && retry) {
    const password = window.prompt("Mot de passe de l'application :");
    if (password) {
      try {
        localStorage.setItem(PASSWORD_KEY, password);
      } catch {
        // Stockage indisponible
      }
      return postJson(url, body, false);
    }
  }

  const raw = await res.text();
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error(`Réponse inattendue (${res.status}) : ${raw.slice(0, 300)}`);
  }

  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data ? String(data.error) : null;
    throw new Error(message ?? `Erreur serveur (${res.status}).`);
  }
  return data;
}

export async function structureCv(text: string): Promise<MasterCv> {
  return MasterCvSchema.parse(await postJson("/api/extract", { text }));
}

export async function analyzeOffer(cv: MasterCv, offerText: string): Promise<OfferAnalysis> {
  return OfferAnalysisSchema.parse(await postJson("/api/analyze", { cv, offerText }));
}

export async function tailorCv(params: {
  cv: MasterCv;
  analysis: OfferAnalysis;
  accepted: string[];
  offerText: string;
  maxPages: 1 | 2;
}): Promise<TailoredCv> {
  return TailoredCvSchema.parse(await postJson("/api/tailor", params));
}

export async function generateLetter(params: {
  cv: MasterCv;
  analysis: OfferAnalysis;
  accepted: string[];
  offerText: string;
  tone: "professional" | "direct";
  length: "short" | "standard";
}): Promise<CoverLetter> {
  return CoverLetterSchema.parse(await postJson("/api/letter", params));
}