declare module 'pdfkit' {
  interface PDFDocumentOptions {
    margin?: number;
    size?: string;
    [key: string]: unknown;
  }
  class PDFDocument {
    constructor(options?: PDFDocumentOptions);
    on(event: string, fn: (...args: unknown[]) => void): this;
    fontSize(size: number): this;
    text(text: string, options?: Record<string, unknown>): this;
    moveDown(n?: number): this;
    end(): void;
    [key: string]: unknown;
  }
  export = PDFDocument;
}
