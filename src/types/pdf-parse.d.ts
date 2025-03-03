declare module 'pdf-parse' {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: {
      PDFFormatVersion: string;
      IsAcroFormPresent: boolean;
      IsXFAPresent: boolean;
      [key: string]: unknown;
    };
    metadata: Record<string, unknown>;
    text: string;
    version: string;
  }

  interface PDFParseOptions {
    pagerender?: (pageData: {pageNum: number; pageIndex: number}) => string | null;
    max?: number;
    version?: string;
  }

  function parse(dataBuffer: Buffer, options?: PDFParseOptions): Promise<PDFData>;
  
  export = parse;
} 