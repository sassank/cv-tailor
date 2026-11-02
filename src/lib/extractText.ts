import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.size > MAX_SIZE) {
    throw new Error("Fichier trop volumineux (5 Mo maximum).");
  }

  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();

  let text: string;
  if (name.endsWith(".pdf")) text = await extractPdf(buffer);
  else if (name.endsWith(".docx")) text = await extractDocx(buffer);
  else throw new Error("Format non pris en charge : utilisez un PDF ou un DOCX.");

  text = clean(text);
  if (text.length < 50) {
    throw new Error("Aucun texte détecté. Le PDF est peut-être une image scannée.");
  }
  return text;
}

async function extractPdf(buffer: ArrayBuffer): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  try {
    const pdf = await loadingTask.promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : "") : ""))
        .join("");
      pages.push(pageText);
    }
    return pages.join("\n\n");
  } finally {
    await loadingTask.destroy();
  }
}

async function extractDocx(buffer: ArrayBuffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });
  return value;
}

function clean(text: string): string {
  return text
    .replace(/\u00a0/g, " ")     // espaces insécables
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}