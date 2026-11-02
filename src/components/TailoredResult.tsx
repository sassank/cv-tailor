import { lazy, Suspense, useMemo } from "react";
import type { ResolvedCv } from "../shared/cv";
import type { MasterCv, OfferAnalysis, TailoredCv } from "../shared/schemas";
import { buildTailoredCv, type Check } from "../shared/tailor";

const CvPreview = lazy(() => import("./CvPreview"));

export function TailoredResult({
  master,
  analysis,
  accepted,
  tailored,
  maxPages,
  stale,
}: {
  master: MasterCv;
  analysis: OfferAnalysis;
  accepted: string[];
  tailored: TailoredCv;
  maxPages: 1 | 2;
  stale: boolean;
}) {
  const { cv, checks } = useMemo(
    () => buildTailoredCv(master, analysis, accepted, tailored),
    [master, analysis, accepted, tailored],
  );

  return (
    <section className="space-y-4 rounded-lg border border-gray-200 p-4">
      <div>
        <h2 className="font-medium">Votre CV adapté</h2>
        <p className="text-sm text-gray-600">
          Pour : {analysis.jobTitle}
          {analysis.company && ` · ${analysis.company}`}
        </p>
      </div>

      {stale && (
        <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">
          Votre CV, l'offre ou vos choix ont changé depuis la génération. Régénérez pour être à jour.
        </p>
      )}

      <Verification checks={checks} />
      <Comparison master={master} cv={cv} />

      <Suspense fallback={<p className="text-sm text-gray-600">Chargement de l'aperçu…</p>}>
        <CvPreview
          key={maxPages}
          cv={cv}
          defaultMaxPages={maxPages}
          fileLabel={analysis.company ?? analysis.jobTitle}
        />
      </Suspense>
    </section>
  );
}

function Verification({ checks }: { checks: Check[] }) {
  const errors = checks.filter((c) => c.level === "error");
  const warnings = checks.filter((c) => c.level === "warning");
  const infos = checks.filter((c) => c.level === "info");

  return (
    <div className="space-y-2">
      <h3 className="font-medium">Vérification</h3>

      {errors.length === 0 ? (
        <p className="rounded bg-green-50 p-3 text-sm text-green-800">
          Aucun chiffre, outil ou mot-clé ajouté sans preuve.
        </p>
      ) : (
        <div className="rounded bg-red-50 p-3 text-sm text-red-800">
          <p className="font-medium">À corriger avant d'envoyer ({errors.length})</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {errors.map((c, i) => (
              <li key={i}>{c.message}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs">
            Régénérez le CV, ou ajoutez l'information à votre CV de base si elle est vraie.
          </p>
        </div>
      )}

      {warnings.length > 0 && (
        <details className="rounded bg-amber-50 p-3 text-sm text-amber-800">
          <summary className="cursor-pointer">Éléments retirés automatiquement ({warnings.length})</summary>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {warnings.map((c, i) => (
              <li key={i}>{c.message}</li>
            ))}
          </ul>
        </details>
      )}

      {infos.map((c, i) => (
        <p key={i} className="text-sm text-gray-600">
          {c.message}
        </p>
      ))}
    </div>
  );
}

function Comparison({ master, cv }: { master: MasterCv; cv: ResolvedCv }) {
  return (
    <details className="rounded border border-gray-200 p-3">
      <summary className="cursor-pointer text-sm font-medium">Comparer avec votre CV d'origine</summary>
      <div className="mt-3 space-y-5">
        <Pair title="Profil" original={master.summary ? [master.summary] : []} adapted={cv.summary ? [cv.summary] : []} />
        {master.experiences.map((exp) => (
          <Pair
            key={exp.id}
            title={[exp.jobTitle, exp.company].filter(Boolean).join(" — ")}
            original={exp.bullets.map((b) => b.text).filter(Boolean)}
            adapted={cv.experiences.find((e) => e.id === exp.id)?.bullets ?? []}
          />
        ))}
      </div>
    </details>
  );
}

function Pair({ title, original, adapted }: { title: string; original: string[]; adapted: string[] }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{title}</p>
      <div className="grid gap-3 text-sm md:grid-cols-2">
        <BulletList label="Original" items={original} />
        <BulletList label="Adapté" items={adapted} highlight />
      </div>
    </div>
  );
}

function BulletList({ label, items, highlight }: { label: string; items: string[]; highlight?: boolean }) {
  return (
    <div className={`rounded p-2 ${highlight ? "bg-blue-50" : "bg-gray-50"}`}>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      {items.length === 0 ? (
        <p className="text-gray-400">(aucune puce affichée)</p>
      ) : (
        <ul className="list-disc space-y-1 pl-4">
          {items.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}