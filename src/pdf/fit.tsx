import { pdf } from "@react-pdf/renderer";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { ResolvedCv } from "../shared/cv";
import { CvDocument } from "./CvDocument";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

// Paliers de réduction : en dessous de 0.84, le texte devient trop petit (< 7,5 pt)
const SCALES = [1, 0.95, 0.9, 0.87, 0.84];

export type FitResult = { scale: number; pages: number; fits: boolean; blob: Blob | null };

async function countPages(blob: Blob): Promise<number> {
  const task = pdfjsLib.getDocument({ data: await blob.arrayBuffer() });
  try {
    return (await task.promise).numPages;
  } finally {
    await task.destroy();
  }
}

/** Cherche la plus grande échelle qui fait tenir le CV en `maxPages` pages. */
export async function findFittingScale(cv: ResolvedCv, maxPages: number): Promise<FitResult> {
  let last: { scale: number; pages: number; blob: Blob } | null = null;
  for (const scale of SCALES) {
    const blob = await pdf(<CvDocument cv={cv} scale={scale} />).toBlob();
    const pages = await countPages(blob);
    last = { scale, pages, blob };
    if (pages <= maxPages) return { ...last, fits: true };
  }
  return last ? { ...last, fits: false } : { scale: 1, pages: 0, fits: false, blob: null };
}