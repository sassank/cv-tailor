import type { MasterCv, MasterExperience, MasterProject } from "../shared/schemas";
import { move, nextId, orNull, removeAt, replaceAt } from "../lib/utils";
import {
  AddButton,
  Field,
  ItemToolbar,
  ListSection,
  RemoveButton,
  Section,
  TagInput,
  TextArea,
  TextInput,
} from "./ui";

type Bullet = MasterExperience["bullets"][number];
type Education = MasterCv["education"][number];
type Certification = MasterCv["certifications"][number];
type Language = MasterCv["languages"][number];

export function MasterCvEditor({ cv, onChange }: { cv: MasterCv; onChange: (cv: MasterCv) => void }) {
  function set<K extends keyof MasterCv>(key: K, value: MasterCv[K]) {
    onChange({ ...cv, [key]: value });
  }

  const contact = cv.contact;
  const setContact = (patch: Partial<MasterCv["contact"]>) => set("contact", { ...contact, ...patch });

  return (
    <div className="space-y-6">
      {/* Coordonnées */}
      <Section title="Coordonnées">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nom complet">
            <TextInput value={contact.fullName} onChange={(v) => setContact({ fullName: v })} />
          </Field>
          <Field label="Titre">
            <TextInput value={contact.headline} onChange={(v) => setContact({ headline: orNull(v) })} />
          </Field>
          <Field label="E-mail">
            <TextInput type="email" value={contact.email} onChange={(v) => setContact({ email: orNull(v) })} />
          </Field>
          <Field label="Téléphone">
            <TextInput type="tel" value={contact.phone} onChange={(v) => setContact({ phone: orNull(v) })} />
          </Field>
          <Field label="Localisation">
            <TextInput value={contact.location} onChange={(v) => setContact({ location: orNull(v) })} />
          </Field>
        </div>

        <Field label="Liens">
          <div className="space-y-2">
            {contact.links.map((link, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-36">
                  <TextInput
                    value={link.label}
                    placeholder="Libellé"
                    onChange={(v) => setContact({ links: replaceAt(contact.links, i, { ...link, label: v }) })}
                  />
                </div>
                <div className="flex-1">
                  <TextInput
                    value={link.url}
                    placeholder="https://…"
                    onChange={(v) => setContact({ links: replaceAt(contact.links, i, { ...link, url: v }) })}
                  />
                </div>
                <RemoveButton onClick={() => setContact({ links: removeAt(contact.links, i) })} />
              </div>
            ))}
            <AddButton onClick={() => setContact({ links: [...contact.links, { label: "", url: "" }] })}>
              Ajouter un lien
            </AddButton>
          </div>
        </Field>
      </Section>

      {/* Présentation */}
      <Section title="Présentation">
        <TextArea rows={4} value={cv.summary} onChange={(v) => set("summary", orNull(v))} />
      </Section>

      {/* Expériences */}
      <ListSection
        title="Expériences professionnelles"
        items={cv.experiences}
        getKey={(e) => e.id}
        onChange={(items) => set("experiences", items)}
        addLabel="Ajouter une expérience"
        createItem={() => ({
          id: nextId(cv.experiences.map((e) => e.id), "exp-"),
          jobTitle: "",
          company: null,
          location: null,
          startDate: null,
          endDate: "",
          bullets: [],
          tools: [],
        })}
        renderItem={(exp, update) => <ExperienceFields exp={exp} onChange={update} />}
      />

      {/* Projets */}
      <ListSection
        title="Projets"
        items={cv.projects}
        getKey={(p) => p.id}
        onChange={(items) => set("projects", items)}
        addLabel="Ajouter un projet"
        createItem={() => ({
          id: nextId(cv.projects.map((p) => p.id), "prj-"),
          name: "",
          context: null,
          date: null,
          url: null,
          bullets: [],
          tools: [],
        })}
        renderItem={(prj, update) => <ProjectFields prj={prj} onChange={update} />}
      />

      {/* Compétences */}
      <ListSection
        title="Compétences"
        items={cv.skills}
        getKey={(_, i) => `skill-${i}`}
        onChange={(items) => set("skills", items)}
        addLabel="Ajouter une catégorie"
        createItem={() => ({ category: "", items: [] })}
        renderItem={(group, update) => (
          <>
            <Field label="Catégorie">
              <TextInput value={group.category} onChange={(v) => update({ ...group, category: v })} />
            </Field>
            <Field label="Compétences">
              <TagInput values={group.items} onChange={(items) => update({ ...group, items })} />
            </Field>
          </>
        )}
      />

      {/* Formation */}
      <ListSection
        title="Formation"
        items={cv.education}
        getKey={(e) => e.id}
        onChange={(items) => set("education", items)}
        addLabel="Ajouter une formation"
        createItem={() => ({
          id: nextId(cv.education.map((e) => e.id), "edu-"),
          degree: "",
          school: null,
          location: null,
          startDate: null,
          endDate: "",
          details: null,
        })}
        renderItem={(edu, update) => <EducationFields edu={edu} onChange={update} />}
      />

      {/* Certifications */}
      <ListSection
        title="Certifications"
        items={cv.certifications}
        getKey={(c) => c.id}
        onChange={(items) => set("certifications", items)}
        addLabel="Ajouter une certification"
        createItem={() => ({
          id: nextId(cv.certifications.map((c) => c.id), "cert-"),
          name: "",
          issuer: null,
          date: null,
        })}
        renderItem={(cert, update) => <CertificationFields cert={cert} onChange={update} />}
      />

      {/* Langues */}
      <ListSection
        title="Langues"
        items={cv.languages}
        getKey={(l) => l.id}
        onChange={(items) => set("languages", items)}
        addLabel="Ajouter une langue"
        createItem={() => ({ id: nextId(cv.languages.map((l) => l.id), "lang-"), language: "", level: null })}
        renderItem={(lang, update) => <LanguageFields lang={lang} onChange={update} />}
      />

      {/* Centres d'intérêt */}
      <Section title="Centres d'intérêt">
        <TagInput values={cv.interests} onChange={(items) => set("interests", items)} />
      </Section>
    </div>
  );
}

/* ---------- Sous-formulaires ---------- */

function DateRange({
  start,
  end,
  onChange,
}: {
  start: string | null;
  end: string | null;
  onChange: (start: string | null, end: string | null) => void;
}) {
  const current = end === null; // null = en cours
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Début">
        <TextInput value={start} placeholder="AAAA-MM" onChange={(v) => onChange(orNull(v), end)} />
      </Field>
      <Field label="Fin">
        <TextInput
          value={end}
          placeholder={current ? "En cours" : "AAAA-MM"}
          disabled={current}
          onChange={(v) => onChange(start, v)}
        />
        <label className="mt-1 inline-flex items-center gap-1.5 text-xs text-gray-600">
          <input type="checkbox" checked={current} onChange={(e) => onChange(start, e.target.checked ? null : "")} />
          En cours
        </label>
      </Field>
    </div>
  );
}

function BulletsEditor({
  parentId,
  bullets,
  onChange,
}: {
  parentId: string;
  bullets: Bullet[];
  onChange: (bullets: Bullet[]) => void;
}) {
  return (
    <div className="space-y-2">
      {bullets.map((b, i) => (
        <div key={b.id} className="flex items-start gap-2">
          <div className="flex-1">
            <TextArea rows={2} value={b.text} onChange={(v) => onChange(replaceAt(bullets, i, { ...b, text: v }))} />
          </div>
          <ItemToolbar
            index={i}
            count={bullets.length}
            onMove={(dir) => onChange(move(bullets, i, dir))}
            onRemove={() => onChange(removeAt(bullets, i))}
          />
        </div>
      ))}
      <AddButton
        onClick={() =>
          onChange([...bullets, { id: nextId(bullets.map((b) => b.id), `${parentId}-b`), text: "" }])
        }
      >
        Ajouter une puce
      </AddButton>
    </div>
  );
}

function ExperienceFields({ exp, onChange }: { exp: MasterExperience; onChange: (e: MasterExperience) => void }) {
  const set = (patch: Partial<MasterExperience>) => onChange({ ...exp, ...patch });
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Intitulé du poste">
          <TextInput value={exp.jobTitle} onChange={(v) => set({ jobTitle: v })} />
        </Field>
        <Field label="Entreprise">
          <TextInput value={exp.company} onChange={(v) => set({ company: orNull(v) })} />
        </Field>
        <Field label="Lieu">
          <TextInput value={exp.location} onChange={(v) => set({ location: orNull(v) })} />
        </Field>
        <DateRange
          start={exp.startDate}
          end={exp.endDate}
          onChange={(startDate, endDate) => set({ startDate, endDate })}
        />
      </div>
      <Field label="Missions et réalisations">
        <BulletsEditor parentId={exp.id} bullets={exp.bullets} onChange={(bullets) => set({ bullets })} />
      </Field>
      <Field label="Outils et technologies">
        <TagInput values={exp.tools} onChange={(tools) => set({ tools })} />
      </Field>
    </>
  );
}

function ProjectFields({ prj, onChange }: { prj: MasterProject; onChange: (p: MasterProject) => void }) {
  const set = (patch: Partial<MasterProject>) => onChange({ ...prj, ...patch });
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Nom du projet">
          <TextInput value={prj.name} onChange={(v) => set({ name: v })} />
        </Field>
        <Field label="Contexte">
          <TextInput
            value={prj.context}
            placeholder="Projet personnel, projet d'école…"
            onChange={(v) => set({ context: orNull(v) })}
          />
        </Field>
        <Field label="Date">
          <TextInput value={prj.date} placeholder="AAAA-MM" onChange={(v) => set({ date: orNull(v) })} />
        </Field>
        <Field label="Lien">
          <TextInput value={prj.url} placeholder="https://…" onChange={(v) => set({ url: orNull(v) })} />
        </Field>
      </div>
      <Field label="Description et réalisations">
        <BulletsEditor parentId={prj.id} bullets={prj.bullets} onChange={(bullets) => set({ bullets })} />
      </Field>
      <Field label="Outils et technologies">
        <TagInput values={prj.tools} onChange={(tools) => set({ tools })} />
      </Field>
    </>
  );
}

function EducationFields({ edu, onChange }: { edu: Education; onChange: (e: Education) => void }) {
  const set = (patch: Partial<Education>) => onChange({ ...edu, ...patch });
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Diplôme">
        <TextInput value={edu.degree} onChange={(v) => set({ degree: v })} />
      </Field>
      <Field label="École">
        <TextInput value={edu.school} onChange={(v) => set({ school: orNull(v) })} />
      </Field>
      <Field label="Lieu">
        <TextInput value={edu.location} onChange={(v) => set({ location: orNull(v) })} />
      </Field>
      <DateRange
        start={edu.startDate}
        end={edu.endDate}
        onChange={(startDate, endDate) => set({ startDate, endDate })}
      />
      <div className="md:col-span-2">
        <Field label="Détails (spécialité, mention…)">
          <TextInput value={edu.details} onChange={(v) => set({ details: orNull(v) })} />
        </Field>
      </div>
    </div>
  );
}

function CertificationFields({ cert, onChange }: { cert: Certification; onChange: (c: Certification) => void }) {
  const set = (patch: Partial<Certification>) => onChange({ ...cert, ...patch });
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Field label="Certification">
        <TextInput value={cert.name} onChange={(v) => set({ name: v })} />
      </Field>
      <Field label="Organisme">
        <TextInput value={cert.issuer} onChange={(v) => set({ issuer: orNull(v) })} />
      </Field>
      <Field label="Date">
        <TextInput value={cert.date} placeholder="AAAA-MM" onChange={(v) => set({ date: orNull(v) })} />
      </Field>
    </div>
  );
}

function LanguageFields({ lang, onChange }: { lang: Language; onChange: (l: Language) => void }) {
  const set = (patch: Partial<Language>) => onChange({ ...lang, ...patch });
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Langue">
        <TextInput value={lang.language} onChange={(v) => set({ language: v })} />
      </Field>
      <Field label="Niveau">
        <TextInput
          value={lang.level}
          placeholder="Courant, B2, TOEIC 810…"
          onChange={(v) => set({ level: orNull(v) })}
        />
      </Field>
    </div>
  );
}