import { Document, Font, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Contact } from "../shared/schemas";
import type { LetterDraft } from "../shared/letter";
import { formatPhone, phoneHref, plainDashes } from "./format";

Font.registerHyphenationCallback((word) => [word]);

const ACCENT = "#24476b";
const TEXT = "#1f2328";
const MUTED = "#5f6b7a";

const s = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 64,
    fontFamily: "Helvetica",
    fontSize: 10.5,
    lineHeight: 1.5,
    color: TEXT,
  },
  name: { fontFamily: "Helvetica-Bold", fontSize: 14, color: ACCENT, lineHeight: 1.2 },
  sender: { fontSize: 9, color: MUTED, marginTop: 4, lineHeight: 1.4 },
  link: { color: MUTED, textDecoration: "none" },
  recipient: { marginTop: 28, alignItems: "flex-end" },
  bold: { fontFamily: "Helvetica-Bold" },
  date: { marginTop: 8 },
  subject: { marginTop: 24, fontFamily: "Helvetica-Bold" },
  body: { marginTop: 18 },
  paragraph: { marginBottom: 10, textAlign: "justify" },
  signature: { marginTop: 18, fontFamily: "Helvetica-Bold" },
});

export function LetterDocument({
  contact,
  draft,
  company,
  lang,
}: {
  contact: Contact;
  draft: LetterDraft;
  company: string | null;
  lang: "fr" | "en";
}) {
  const en = lang === "en";
  const city = contact.location?.replace(/\d+/g, "").trim() ?? "";
  const date = new Date().toLocaleDateString(en ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const dateLine = en ? [city, date].filter(Boolean).join(", ") : city ? `${city}, le ${date}` : `Le ${date}`;
  const paragraphs = draft.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <Document
      title={`${en ? "Cover letter" : "Lettre de motivation"} - ${contact.fullName}`}
      author={contact.fullName}
      language={lang}
    >
      <Page size="A4" style={s.page}>
        {/* Expéditeur */}
        <Text style={s.name}>{contact.fullName}</Text>
        <View style={s.sender}>
          {contact.location && <Text>{contact.location}</Text>}
          {contact.email && (
            <Link src={`mailto:${contact.email}`} style={s.link}>
              {contact.email}
            </Link>
          )}
          {contact.phone && (
            <Link src={phoneHref(contact.phone)} style={s.link}>
              {formatPhone(contact.phone)}
            </Link>
          )}
        </View>

        {/* Destinataire et date */}
        <View style={s.recipient}>
          {company && <Text>{en ? "Hiring team" : "À l'attention de l'équipe de recrutement"}</Text>}
          {company && <Text style={s.bold}>{company}</Text>}
          <Text style={s.date}>{dateLine}</Text>
        </View>

        <Text style={s.subject}>
          {en ? "Subject: " : "Objet : "}
          {plainDashes(draft.subject)}
        </Text>

        <View style={s.body}>
          {paragraphs.map((p, i) => (
            <Text key={i} style={s.paragraph}>
              {plainDashes(p)}
            </Text>
          ))}
        </View>

        <Text style={s.signature}>{contact.fullName}</Text>
      </Page>
    </Document>
  );
}