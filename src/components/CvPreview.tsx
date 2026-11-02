import { useEffect, useState } from "react";
import { PDFViewer } from "@react-pdf/renderer";
import { CvDocument } from "../pdf/CvDocument";
import { findFittingScale, type FitResult } from "../pdf/fit";
import { extractTextFromFile } from "../lib/extractText";
import type { ResolvedCv } from "../shared/cv";

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export default function CvPreview({
  cv,
  defaultMaxPages = 1,
  fileLabel,
}: {
  cv: ResolvedCv;
  defaultMaxPages?: 1 | 2;
  fileLabel?: string;
}) {
  const [maxPages, setMaxPages] = useState<1 | 2>(defaultMaxPages);
  const [fit, setFit] = useState<FitResult | null>(null);
  const [atsText, setAtsText] = useState<string | null>(null);

  // Ajuste la mise en page, puis extrait le texte du PDF obtenu (test ATS)
  useEffect(() => {
    let cancelled = false;
    setFit(null);
    setAtsText(null);

    findFittingScale(cv, maxPages)
      .then(async (result) => {
        if (cancelled) return;
        setFit(result);
        if (!result.blob) return;
        try {
          const file = new File([result.blob], "cv.pdf", { type: "application/pdf" });
          const text = await extractTextFromFile(file);
          if (!cancelled) setAtsText(text);
        } catch {
          if (!cancelled) setAtsText("");
        }
      })
      .catch(() => {
        if (!cancelled) setFit({ scale: 1, pages: 0, fits: false, blob: null });
      });

    return () => {
      cancelled = true;
    };
  }, [cv, maxPages]);

  function download() {
    if (!fit?.blob) return;
    const name = ["CV", slug(cv.contact.fullName), fileLabel ? slug(fileLabel) : ""].filter(Boolean).join("-");
    const url = URL.createObjectURL(fit.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-700">
            Longueur{" "}
            <select
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value) as 1 | 2)}
              className="ml-1 rounded border border-gray-300 px-2 py-1 text-sm"
            >
              <option value={1}>1 page</option>
              <option value={2}>2 pages maximum</option>
            </select>
          </label>

          {!fit && <span className="text-sm text-gray-500">Ajustement de la mise en page…</span>}
          {fit?.fits && (
            <span className="rounded bg-green-50 px-2 py-1 text-sm text-green-700">
              {fit.pages} page{fit.pages > 1 ? "s" : ""}
              {fit.scale < 1 && " · mise en page compactée"}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={download}
          disabled={!fit?.blob}
          className="rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
        >
          Télécharger le PDF
        </button>
      </div>

      {fit && !fit.fits && (
        <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">
          Le CV fait {fit.pages} pages, même en mode compact. Retirez ou raccourcissez des éléments,
          ou laissez l'adaptation à l'offre sélectionner les plus pertinents.
        </p>
      )}

      {fit && (
        <PDFViewer className="h-[85vh] w-full rounded border border-gray-200" showToolbar>
          <CvDocument cv={cv} scale={fit.scale} />
        </PDFViewer>
      )}

      {atsText !== null && (
        <details className="rounded border border-gray-200 p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Ce que lit un logiciel de tri (test « Ctrl+A, Ctrl+C »)
          </summary>
          <p className="mt-2 text-xs text-gray-500">
            Texte extrait du PDF généré, dans l'ordre de lecture. S'il apparaît dans le bon ordre, un ATS le lira
            correctement.
          </p>
          <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs">
            {atsText || "Aucun texte détecté."}
          </pre>
        </details>
      )}
    </div>
  );
}