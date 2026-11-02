import type { VercelRequest, VercelResponse } from "@vercel/node";
import { timingSafeEqual } from "node:crypto";

/**
 * Vérifie le mot de passe envoyé dans l'en-tête X-App-Password.
 * Retourne false (et répond 401) s'il est invalide.
 * En local, sans APP_PASSWORD, l'accès est libre.
 */
export function checkPassword(req: VercelRequest, res: VercelResponse): boolean {
  const expected = process.env.APP_PASSWORD;

  if (!expected) {
    if (process.env.VERCEL_ENV === "production") {
      res.status(500).json({ error: "APP_PASSWORD n'est pas configuré sur le serveur." });
      return false;
    }
    return true;
  }

  const given = req.headers["x-app-password"];
  const a = Buffer.from(typeof given === "string" ? given : "");
  const b = Buffer.from(expected);
  const ok = a.length === b.length && timingSafeEqual(a, b);

  if (!ok) res.status(401).json({ error: "Mot de passe incorrect." });
  return ok;
}