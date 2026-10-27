export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_FILE_PAGES = 1000;

export type UploadErrorCode = "type" | "size" | "empty" | "pages" | "password" | "invalid";
export class UploadError extends Error {
  constructor(public code: UploadErrorCode) {
    super(code);
  }
}

export type PrintFile = { id: string; file: File; pages: number };

export function validateFile(file: Pick<File, "name" | "type" | "size">) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  };
  if (!extension || !mimeTypes[extension] || (file.type && file.type !== mimeTypes[extension])) {
    throw new UploadError("type");
  }
  if (file.size === 0) throw new UploadError("empty");
  if (file.size > MAX_FILE_BYTES) throw new UploadError("size");
  return extension === "pdf" ? "pdf" : "image";
}

export function validatePages(pages: number) {
  if (!Number.isSafeInteger(pages) || pages < 1 || pages > MAX_FILE_PAGES) throw new UploadError("pages");
  return pages;
}

export function printedSides(pages: number, copies: number) {
  return pages * copies;
}

// Called only from a file-input event. Keep PDF.js and decoding out of SSR.
export async function detectPages(file: File): Promise<number> {
  const kind = validateFile(file);
  try {
    if (kind === "image") {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
      return 1;
    }
    const pdfjs = await import("pdfjs-dist");
    const { default: workerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false });
    try {
      const pdf = await task.promise;
      return validatePages(pdf.numPages);
    } finally {
      await task.destroy();
    }
  } catch (error) {
    if (error instanceof UploadError) throw error;
    if (error instanceof Error && error.name === "PasswordException") throw new UploadError("password");
    throw new UploadError("invalid");
  }
}