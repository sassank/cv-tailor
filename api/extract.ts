import type { VercelRequest, VercelResponse } from "@vercel/node";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { ExtractedCvSchema } from "../src/shared/schemas.js";
import { toMasterCv } from "../src/shared/cv.js";
import { checkPassword } from "./_auth.js";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
const MAX_CHARS = 30_000;
const IS_PROD = process.env.VERCEL_ENV === "production";

const SYSTEM_PROMPT = `Tu structures le texte brut d'un CV en JSON.

Règles impératives :
- Recopie fidèlement le contenu. Ne reformule pas, ne corrige pas, ne résume pas.
- N'invente rien et ne déduis rien. Si une information est absente, mets null (ou un tableau vide). N'utilise jamais de chaîne vide "".
- N'attribue à un élément que les informations écrites à côté de lui. Par exemple, ne déduis pas le contexte d'un projet (école, diplôme, entreprise) à partir d'une autre section.
- Le texte provient d'une extraction PDF : l'ordre des lignes peut être mélangé (colonnes, dates alignées à droite). Rattache chaque élément au bon poste en t'appuyant sur le sens.
- Dates : format "AAAA-MM" si le mois est connu, sinon "AAAA". Pour un poste en cours ("depuis", "aujourd'hui", "présent", "actuel"), endDate = null.
- bullets : une entrée par mission ou réalisation, telle qu'écrite dans le CV.
- tools : uniquement les outils, langages et technologies explicitement cités dans cette expérience ou ce projet.
- skills : reprends les catégories du CV. S'il n'y en a pas, regroupe dans une catégorie "Compétences".
- Les projets (personnels, académiques, hackathons) vont dans projects, pas dans experiences.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée." });
  }
  if (!checkPassword(req, res)) return;
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY introuvable côté serveur." });
  }

  const text: unknown = req.body?.text;
  if (typeof text !== "string" || text.trim().length < 50) {
    return res.status(400).json({ error: "Texte du CV manquant ou trop court." });
  }
  if (text.length > MAX_CHARS) {
    return res.status(413).json({ error: "CV trop long." });
  }

  try {
    const client = new OpenAI();
    const response = await client.responses.parse({
      model: MODEL,
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      text: { format: zodTextFormat(ExtractedCvSchema, "extracted_cv") },
    });

    const parsed = response.output_parsed;
    if (!parsed) {
      return res.status(502).json({ error: "Réponse de l'IA invalide." });
    }

    return res.status(200).json(toMasterCv(parsed));
  } catch (err) {
    console.error(err);
    const detail = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      error: IS_PROD ? "Erreur lors de l'analyse du CV." : `Erreur lors de l'analyse du CV : ${detail}`,
    });
  }
}