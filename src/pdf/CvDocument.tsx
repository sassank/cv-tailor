import type { ReactNode } from "react";
import { Document, Font, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ResolvedCv } from "../shared/cv";
import { displayUrl, formatDate, formatPeriod, formatPhone, phoneHref, plainDashes } from "./format";
// Pas de césure automatique (elle coupe mal les mots français)
Font.registerHyphenationCallback((word) => [word]);

const ACCENT = "#2e4b68";
const TEXT = "#1f2328";
const MUTED = "#47566e";
const RULE = "#d5dbe3";

/** Toutes les tailles sont multipliées par `scale` pour l'ajustement automatique. */
function makeStyles(scale: number) {
  const k = (n: number) => Math.round(n * scale * 100) / 100;

  return StyleSheet.create({
    page: {
      paddingTop: k(30),
      paddingBottom: k(30),
      paddingHorizontal: k(36),
      fontFamily: "Helvetica",
      fontSize: k(9),
      lineHeight: 1.4,
      color: TEXT,
    },

    // En-tête : nom | titre sur une ligne
    header: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", columnGap: k(8) },
    name: { fontFamily: "Helvetica-Bold", fontSize: k(20), color: ACCENT, letterSpacing: 0.2, lineHeight: 1 },
    headerSep: { fontSize: k(18), color: RULE, lineHeight: 1 },
    headline: { fontFamily: "Helvetica-Bold", fontSize: k(18), color: TEXT, lineHeight: 1 },
    contact: {
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: k(12),
      rowGap: k(4),
      marginTop: k(14),
      fontSize: k(8.5),
      color: MUTED,
    },
    link: { color: MUTED, textDecoration: "none" },
    headerRule: { height: 2, backgroundColor: ACCENT, marginTop: k(8) },

    // Sections
    section: { marginTop: k(12) },
    sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: k(5) },
    sectionTitle: {
      fontFamily: "Helvetica-Bold",
      fontSize: k(9.5),
      color: ACCENT,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    sectionRule: { flex: 1, height: 0.75, backgroundColor: RULE, marginLeft: k(8) },

    // Entrées (expériences, formations)
    entry: { marginBottom: k(8) },
    entryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    entryTitle: { flex: 1, paddingRight: k(8) },
    date: { fontSize: k(8), color: MUTED },
    bullet: { flexDirection: "row", marginTop: k(1.5), paddingLeft: k(2) },
    bulletDot: { width: k(9), color: ACCENT },
    bulletText: { flex: 1 },
    stack: { fontSize: k(7.5), color: MUTED, marginTop: k(2), paddingLeft: k(11) },

    // Compétences sur deux colonnes
    skillsGrid: { flexDirection: "row", flexWrap: "wrap" },
    skillRow: { width: "50%", flexDirection: "row", marginBottom: k(2.5), paddingRight: k(10) },
    skillLabel: { fontFamily: "Helvetica-Bold", width: k(92), paddingRight: k(6) },
    skillItems: { flex: 1 },

    // Projets en une ligne
    project: { marginBottom: k(4) },
    projectStack: { fontSize: k(8), color: MUTED },

    // Bas de page en deux colonnes
    columns: { flexDirection: "row", columnGap: k(16) },
    colWide: { flex: 1.2 },
    col: { flex: 1 },

    // Utilitaires
    bold: { fontFamily: "Helvetica-Bold" },
    accent: { color: ACCENT },
    muted: { color: MUTED },
    line: { marginBottom: k(3.5) },
    footer: { position: "absolute", bottom: k(14), right: k(36), fontSize: k(7), color: MUTED },
  });
}

type Styles = ReturnType<typeof makeStyles>;

export function CvDocument({ cv, scale = 1 }: { cv: ResolvedCv; scale?: number }) {
  const s = makeStyles(scale);
  const { contact } = cv;
  const hasBottomLeft = cv.education.length > 0 || cv.certifications.length > 0;
  const hasBottomRight = cv.languages.length > 0 || cv.interests.length > 0;

  return (
    <Document title={`CV - ${contact.fullName}`} author={contact.fullName} language="fr">
      <Page size="A4" style={s.page}>
        {/* En-tête */}
        <View style={s.header}>
          <Text style={s.name}>{contact.fullName}</Text>
          {cv.headline && (
            <>
              <Text style={s.headerSep}>|</Text>
              <Text style={s.headline}>{cv.headline}</Text>
            </>
          )}
        </View>
        <ContactRow contact={contact} s={s} />
        <View style={s.headerRule} />

        {cv.summary && (
          <Section title="Profil" s={s}>
            <Text>{plainDashes(cv.summary)}</Text>
          </Section>
        )}

        {cv.skills.length > 0 && (
          <Section title="Compétences" s={s}>
            <View style={s.skillsGrid}>
              {cv.skills.map((g, i) => (
                <View key={i} style={s.skillRow} wrap={false}>
                  <Text style={s.skillLabel}>{g.category}</Text>
                  <Text style={s.skillItems}>{g.items.join(", ")}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {cv.experiences.length > 0 && (
          <Section title="Expériences professionnelles" s={s}>
            {cv.experiences.map((e) => (
              <Entry
                key={e.id}
                s={s}
                title={e.jobTitle}
                org={e.company}
                place={e.location}
                date={formatPeriod(e.startDate, e.endDate)}
                bullets={e.bullets}
                tools={e.tools}
              />
            ))}
          </Section>
        )}

        {cv.projects.length > 0 && (
          <Section title="Projets" s={s}>
            {cv.projects.map((p) => (
              <View key={p.id} style={s.project} wrap={false}>
                <Text>
                  <Text style={s.bold}>{p.name}</Text>
                  {p.context && <Text style={s.muted}> ({p.context})</Text>}
                  {p.date && <Text style={s.muted}>, {formatDate(p.date)}</Text>}
                  {p.bullets.length > 0 && <Text> - {plainDashes(p.bullets.join(" "))}</Text>}
                  {p.tools.length > 0 && <Text style={s.projectStack}>  {p.tools.join(" · ")}</Text>}
                  {p.url && (
                    <Text style={s.muted}>
                      {"  "}
                      <Link src={p.url} style={s.link}>{displayUrl(p.url)}</Link>
                    </Text>
                  )}
                </Text>
              </View>
            ))}
          </Section>
        )}

        {(hasBottomLeft || hasBottomRight) && (
          <View style={s.columns}>
            <View style={s.colWide}>
              {cv.education.length > 0 && (
                <Section title="Formation" s={s}>
                  {cv.education.map((e) => (
                    <Entry
                      key={e.id}
                      s={s}
                      title={e.degree}
                      org={e.school}
                      place={e.details ?? e.location}
                      date={formatPeriod(e.startDate, e.endDate)}
                    />
                  ))}
                </Section>
              )}
              {cv.certifications.length > 0 && (
                <Section title="Certifications" s={s}>
                  {cv.certifications.map((c) => (
                    <Entry key={c.id} s={s} title={c.name} org={c.issuer} date={formatDate(c.date)} />
                  ))}
                </Section>
              )}
            </View>

            <View style={s.col}>
              {cv.languages.length > 0 && (
                <Section title="Langues" s={s}>
                  {cv.languages.map((l) => (
                    <Text key={l.id} style={s.line}>
                      <Text style={s.bold}>{l.language}</Text>
                      {l.level && <Text style={s.muted}> - {l.level}</Text>}
                    </Text>
                  ))}
                </Section>
              )}
              {cv.interests.length > 0 && (
                <Section title="Centres d'intérêt" s={s}>
                  <Text>{cv.interests.join(" · ")}</Text>
                </Section>
              )}
            </View>
          </View>
        )}

        <Text
          style={s.footer}
          fixed
          render={({ pageNumber, totalPages }) => (totalPages > 1 ? `${pageNumber} / ${totalPages}` : "")}
        />
      </Page>
    </Document>
  );
}

/* ---------- Blocs ---------- */

function Section({ title, s, children }: { title: string; s: Styles; children: ReactNode }) {
  return (
    <View style={s.section}>
      {/* Évite un titre de section seul en bas de page */}
      <View style={s.sectionHeader} minPresenceAhead={30}>
        <Text style={s.sectionTitle}>{title}</Text>
        <View style={s.sectionRule} />
      </View>
      {children}
    </View>
  );
}

function Entry({
  s,
  title,
  org,
  place,
  date,
  bullets = [],
  tools = [],
}: {
  s: Styles;
  title: string;
  org?: string | null;
  place?: string | null;
  date: string;
  bullets?: string[];
  tools?: string[];
}) {
  return (
    // wrap={false} : une entrée n'est jamais coupée entre deux pages
    <View style={s.entry} wrap={false}>
      <View style={s.entryHeader}>
        <Text style={s.entryTitle}>
          <Text style={s.bold}>{title}</Text>
          {org && <Text style={s.accent}>{" | "}{org}</Text>}
          {place && <Text style={s.muted}>{" | "}{place}</Text>}
        </Text>
        {date && <Text style={s.date}>{date}</Text>}
      </View>
      {bullets.map((b, i) => (
        <View key={i} style={s.bullet}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={s.bulletText}>{plainDashes(b)}</Text>
        </View>
      ))}
      {tools.length > 0 && <Text style={s.stack}>{tools.join(" · ")}</Text>}
    </View>
  );
}

function ContactRow({ contact, s }: { contact: ResolvedCv["contact"]; s: Styles }) {
  const items: ReactNode[] = [];
  if (contact.location) items.push(<Text>{contact.location}</Text>);
  if (contact.email)
    items.push(
      <Link src={`mailto:${contact.email}`} style={s.link}>
        {contact.email}
      </Link>,
    );
  if (contact.phone)
    items.push(
      <Link src={phoneHref(contact.phone)} style={s.link}>
        {formatPhone(contact.phone)}
      </Link>,
  );
  for (const l of contact.links) {
    if (l.url)
      items.push(
        <Link src={l.url} style={s.link}>
          {displayUrl(l.url)}
        </Link>,
      );
  }

  return (
    <View style={s.contact}>
      {items.map((item, i) => (
        <View key={i}>{item}</View>
      ))}
    </View>
  );
}