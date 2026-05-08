// Client-only PDF helpers using pdfjs-dist
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore vite worker import
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
}

export interface PdfExtractResult {
  text: string;
  pageImages: string[]; // data URLs (only filled when text is too sparse)
  numPages: number;
  usedPages: number;
  scanned: boolean;
}

export async function extractPdf(
  file: File,
  opts?: { maxPages?: number },
): Promise<PdfExtractResult> {
  const maxPages = opts?.maxPages ?? 8;
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const used = Math.min(pdf.numPages, maxPages);
  let text = "";
  for (let i = 1; i <= used; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strs = content.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .filter(Boolean);
    text += strs.join(" ") + "\n\n";
  }

  const scanned = text.replace(/\s+/g, "").length < 50;
  const pageImages: string[] = [];
  if (scanned) {
    const renderPages = Math.min(used, 3);
    for (let i = 1; i <= renderPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.6 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({
        canvasContext: ctx,
        viewport,
        canvas,
      } as Parameters<typeof page.render>[0]).promise;
      pageImages.push(canvas.toDataURL("image/jpeg", 0.85));
    }
  }
  return { text: text.trim(), pageImages, numPages: pdf.numPages, usedPages: used, scanned };
}
