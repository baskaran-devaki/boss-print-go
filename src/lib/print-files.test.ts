import { describe, expect, it, vi, afterEach } from "vitest";
import { detectPages, MAX_FILE_BYTES, printedSides, validateFile, validatePages } from "./print-files";

const pdf = vi.hoisted(() => ({ pages: 3, destroy: vi.fn() }));
vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: () => ({ promise: Promise.resolve({ numPages: pdf.pages }), destroy: pdf.destroy }),
}));
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({ default: "/worker.mjs" }));
afterEach(() => { vi.unstubAllGlobals(); });

describe("customer file rules", () => {
  it("accepts PDF, JPG, JPEG and PNG only", () => {
    for (const name of ["notes.pdf", "photo.JPG", "photo.jpeg", "photo.png"]) {
      expect(validateFile({ name, type: "", size: 10 })).toBe(name.endsWith("pdf") ? "pdf" : "image");
    }
    expect(() => validateFile({ name: "notes.docx", type: "", size: 10 })).toThrow("type");
    expect(() => validateFile({ name: "notes.pdf", type: "image/png", size: 10 })).toThrow("type");
  });
  it("rejects empty and oversized files with a 25 MB limit", () => {
    expect(() => validateFile({ name: "a.pdf", type: "", size: 0 })).toThrow("empty");
    expect(validateFile({ name: "a.pdf", type: "", size: MAX_FILE_BYTES })).toBe("pdf");
    expect(() => validateFile({ name: "a.pdf", type: "", size: 25 * 1024 * 1024 + 1 })).toThrow("size");
  });
  it("accepts only whole page counts from 1 through 1000", () => {
    expect(validatePages(1)).toBe(1);
    expect(validatePages(1000)).toBe(1000);
    for (const pages of [0, -1, 1.5, NaN, 1001]) expect(() => validatePages(pages)).toThrow("pages");
  });
  it("uses the PDF.js detected page count and destroys the document", async () => {
    const file = { name: "a.pdf", type: "application/pdf", size: 10, arrayBuffer: async () => new ArrayBuffer(10) } as File;
    expect(await detectPages(file)).toBe(3);
    expect(pdf.destroy).toHaveBeenCalled();
  });
  it("counts each decoded image as one page", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ close }));
    for (const name of ["a.jpg", "a.jpeg", "a.png"]) {
      expect(await detectPages(new File(["image"], name))).toBe(1);
    }
    expect(close).toHaveBeenCalledTimes(3);
  });
  it("rejects damaged images", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("decode failed")));
    await expect(detectPages(new File(["bad image"], "a.png"))).rejects.toThrow("invalid");
  });
  it("multiplies detected pages by copies, including the default single set", () => {
    expect(printedSides(7, 1)).toBe(7);
    expect(printedSides(7, 3)).toBe(21);
  });
});