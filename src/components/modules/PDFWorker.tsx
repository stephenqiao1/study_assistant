'use client'

import { useEffect, useState, useCallback } from 'react';
import { useToast } from "@/components/ui/use-toast";
import Script from 'next/script';

// Define types for PDF.js objects
interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  dir: string;
  fontName?: string;
}

interface PdfTextContent {
  items: PdfTextItem[];
}

interface PdfMetadata {
  info?: {
    Title?: string;
    Author?: string;
    Subject?: string;
    Keywords?: string;
    Creator?: string;
    CreationDate?: string;
  };
}

// Rename the unused interface
interface _PdfDocument {
  numPages: number;
  getPage: (pageNum: number) => Promise<PdfPage>;
  getMetadata?: () => Promise<PdfMetadata>;
}

interface PdfPage {
  getTextContent: () => Promise<PdfTextContent>;
  getViewport: (params: { scale: number }) => { width: number; height: number };
}

// Define the PDF.js document type
type PdfjsDocument = {
  numPages: number;
  getMetadata: () => Promise<{ info?: Record<string, unknown> }>;
  getPage: (pageNum: number) => Promise<{
    getTextContent: () => Promise<{ items: PdfTextItem[] }>;
    getViewport: (params: { scale: number }) => Record<string, number>;
  }>;
};

// Define an interface for the PDF.js library
interface PdfjsLib {
  getDocument: (source: Uint8Array) => { promise: Promise<PdfjsDocument> };
  GlobalWorkerOptions: {
    workerSrc: string;
  };
}

// Add a type declaration at the top of the file to extend the Window interface
declare global {
  interface Window {
    pdfjsLib: PdfjsLib;
  }
}

// Define the props for the PDF Worker component
interface PDFWorkerProps {
  file: File;
  onExtracted: (text: string, numPages: number, metadata?: Record<string, unknown>) => void;
  onProgress: (percent: number) => void;
  onError: (error: Error) => void;
}

/**
 * PDF Worker component that handles client-side PDF text extraction using PDF.js
 */
export default function PDFWorker({ file, onExtracted, onProgress, onError }: PDFWorkerProps) {
  // Renamed unused variables with underscore prefix
  const { toast: _toast } = useToast();
  const [_isLoading, setIsLoading] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  // Handler for when both scripts are loaded
  const handleScriptsLoaded = () => {
    setScriptsLoaded(true);
  };

  // Extract PDF text - wrapped in useCallback to avoid ESLint dependency warnings
  const extractPdfText = useCallback(async () => {
    if (!file || !scriptsLoaded || !window.pdfjsLib) return;
    
    setIsLoading(true);
    onProgress(5); // Start progress
    
    try {
      // Use the globally available PDF.js library
      const pdfjs = window.pdfjsLib;
      onProgress(15);
      
      // Load the PDF file
      onProgress(20);
      const arrayBuffer = await file.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);
      
      const loadingTask = pdfjs.getDocument(typedArray);
      onProgress(25);
      
      const pdf = await loadingTask.promise as PdfjsDocument;
      onProgress(30);
      
      const numPages = pdf.numPages;
      
      // Extract metadata
      const metadata = await pdf.getMetadata();
      
      // Progress tracking variables
      const totalPages = numPages;
      const progressIncrement = 60 / totalPages; // Allocate 60% of progress to page extraction
      
      // Extract text from each page
      let extractedText = '';
      const pageTexts: string[] = [];
      
      // Process pages sequentially to ensure consistent output
      for (let i = 1; i <= totalPages; i++) {
        try {
          // Get the page
          const page = await pdf.getPage(i);
          
          // Get the text content
          const textContent = await page.getTextContent();
          
          // Get page dimensions for structural information (unused, prefix with _)
          const _viewport = page.getViewport({ scale: 1.0 });
          
          // Process text items
          let pageText = '';
          let lastY = -1;
          
          // Sort text items by their position on the page
          const sortedItems = [...textContent.items].sort((a, b) => {
            // Sort by y-coordinate first (top to bottom)
            if (Math.abs(a.transform[5] - b.transform[5]) > 5) {
              return b.transform[5] - a.transform[5];
            }
            // If y is similar, sort by x (left to right)
            return a.transform[4] - b.transform[4];
          });
          
          // Process text items, adding newlines between different y-positions
          for (const item of sortedItems) {
            if (item.str.trim() === '') continue;
            
            const currentY = item.transform[5];
            
            // If we've moved to a new line, add a newline character
            if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
              pageText += '\n';
            } else if (lastY !== -1 && pageText.length > 0 && !pageText.endsWith(' ')) {
              // Add space between words on the same line
              pageText += ' ';
            }
            
            pageText += item.str;
            lastY = currentY;
          }
          
          // Clean up the text
          pageText = pageText.trim();
          
          // Update progress
          onProgress(30 + (i - 1) * progressIncrement);
          
          pageTexts.push(pageText);
        } catch (error) {
          console.error(`Error extracting text from page ${i}:`, error);
          pageTexts.push(`[Error extracting text from page ${i}]`);
        }
      }
      
      // Combine all page texts
      extractedText = pageTexts.join('\n\n');
      
      // Clean up the text
      extractedText = extractedText
        .replace(/\r\n/g, '\n') // Normalize line endings
        .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
        .trim();
      
      onProgress(95); // Almost done
      
      // Create metadata object
      const metadataObject = {
        numPages,
        title: metadata.info?.Title || file.name,
        author: metadata.info?.Author || 'Unknown',
        subject: metadata.info?.Subject || '',
        keywords: metadata.info?.Keywords || '',
        creator: metadata.info?.Creator || '',
        creationDate: metadata.info?.CreationDate || '',
      };
      
      onProgress(100); // Done!
      
      // Call the onExtracted callback with the results
      onExtracted(extractedText, numPages, metadataObject);
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      onError(error instanceof Error ? error : new Error('Failed to extract text from PDF'));
    } finally {
      setIsLoading(false);
    }
  }, [file, scriptsLoaded, onExtracted, onProgress, onError]);

  // Run extraction when dependencies change
  useEffect(() => {
    if (file && scriptsLoaded && window.pdfjsLib) {
      extractPdfText();
    }
  }, [file, scriptsLoaded, extractPdfText]);

  return (
    <>
      {/* Load punycode polyfill first to fix Node.js v17+ compatibility issues */}
      <Script 
        src="https://cdn.jsdelivr.net/npm/punycode@2.3.1/punycode.min.js"
        strategy="afterInteractive"
        onError={(e) => {
          console.error('Failed to load punycode polyfill:', e);
        }}
      />
      
      {/* Load PDF.js scripts - changed from beforeInteractive to afterInteractive */}
      <Script 
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          // Set the worker source
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            handleScriptsLoaded();
          }
        }}
      />
    </>
  );
} 