const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** "2024-03" → "mars 2024" ; "2024" et le texte libre sont conservés tels quels. */
export function formatDate(value: string | null): string {
  if (!value) return "";
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return value;
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${month} ${match[1]}` : value;
}

/** Période d'un poste ou d'une formation. endDate null = en cours. */
export function formatPeriod(start: string | null, end: string | null): string {
  const s = formatDate(start);
  if (end === null) return s ? `Depuis ${s}` : "En cours";
  const e = formatDate(end);
  if (s && e) return s === e ? s : `${s} - ${e}`;
  return s || e;
}

/** "https://www.github.com/sassank/" → "github.com/sassank" */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}

/** "0612345678" → "06 12 34 56 78" (numéros français à 10 chiffres uniquement). */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\s/g, "");
  return /^0\d{9}$/.test(digits) ? digits.replace(/(\d{2})(?=\d)/g, "$1 ") : phone;
}

/** Remplace les tirets longs (— et –) par un tiret simple. */
export function plainDashes(text: string): string {
  return text.replace(/\s*[—–]\s*/g, " - ");
}

/** Lien d'appel au format international : "0619787280" → "tel:+33619787280". */
export function phoneHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return /^0\d{9}$/.test(digits) ? `tel:+33${digits.slice(1)}` : `tel:${digits}`;
}