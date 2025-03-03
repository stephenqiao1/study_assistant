'use client';

import { useEffect, useState, useCallback } from 'react';
import Script from 'next/script';

// Define types for the PDF extraction process
type PDFWorkerProps = {
  file: File | null;
  onExtracted: (text: string) => void;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
};

// Global declaration for PDF.js
declare global {
  interface Window {
    pdfjsLib: {
      getDocument: (source: Uint8Array) => { 
        promise: Promise<PDFDocumentProxy>; 
        onProgress: (data: { loaded: number; total: number }) => void;
      };
      GlobalWorkerOptions: {
        workerSrc: string;
      };
    };
  }
}

// Define types for PDF.js text content item
interface PDFTextItem {
  str: string;
  dir?: string;
  transform?: number[];
  width?: number;
  height?: number;
  fontName?: string;
}

// Define interface for text content
interface PDFTextContent {
  items: PDFTextItem[];
  styles?: Record<string, unknown>;
}

// Define interface for PDF document
interface PDFDocumentProxy {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PDFPageProxy>;
}

// Define interface for PDF page
interface PDFPageProxy {
  getTextContent: () => Promise<PDFTextContent>;
}

export default function PDFWorker({
  file,
  onExtracted,
  onProgress,
  onError,
}: PDFWorkerProps) {
  const [_loading, setLoading] = useState<boolean>(false);
  const [_progress, setProgress] = useState<number>(0);
  const [_error, setError] = useState<Error | null>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [workerScriptLoaded, setWorkerScriptLoaded] = useState(false);

  const extractPdfText = useCallback(async () => {
    if (!file || !window.pdfjsLib) {
      console.error('Missing file or PDF.js not loaded');
      if (onError) onError(new Error('PDF.js not initialized or file missing'));
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setProgress(0);
      
      // Track progress to ensure it's updating
      if (onProgress) onProgress(5);
      
      // Use the globally available PDF.js library
      const pdfjs = window.pdfjsLib;
      
      // Load the PDF file
      const fileReader = new FileReader();
      
      fileReader.onload = async (event) => {
        try {
          if (!event.target?.result) {
            throw new Error('Failed to read file');
          }
          
          if (onProgress) onProgress(10);
          
          const typedarray = new Uint8Array(event.target.result as ArrayBuffer);
          
          // Load the PDF document
          const loadingTask = pdfjs.getDocument(typedarray);
          
          // Add progress tracking
          loadingTask.onProgress = (progressData: { loaded: number; total: number }) => {
            if (progressData.total > 0) {
              const currentProgress = 10 + (progressData.loaded / progressData.total) * 20; // 10-30% of the process
              setProgress(currentProgress);
              if (onProgress) onProgress(currentProgress);
            }
          };
          
          const pdf = await loadingTask.promise;
          const numPages = pdf.numPages;
          
          if (onProgress) onProgress(30);
          
          let fullText = '';
          
          // Iterate through each page to extract text
          for (let i = 1; i <= numPages; i++) {
            // Update progress (30% for loading + 70% for text extraction)
            const extractionProgress = 30 + (i / numPages) * 70;
            setProgress(extractionProgress);
            if (onProgress) onProgress(extractionProgress);
            
            // Get the page
            const page = await pdf.getPage(i);
            
            // Extract text content
            const textContent = await page.getTextContent();
            
            // Concatenate the text items
            const pageText = textContent.items
              .map((item: PDFTextItem) => item.str)
              .join(' ');
            
            fullText += pageText + '\n\n';
          }
          
          // Complete progress
          setProgress(100);
          if (onProgress) onProgress(100);
          
          // Pass the extracted text to the parent component
          onExtracted(fullText);
        } catch (err) {
          console.error('Error processing PDF:', err);
          const error = err instanceof Error ? err : new Error('Failed to process PDF');
          setError(error);
          if (onError) onError(error);
        } finally {
          setLoading(false);
        }
      };
      
      fileReader.onerror = (err) => {
        console.error('Error reading file:', err);
        const error = new Error('Error reading file');
        setError(error);
        if (onError) onError(error);
        setLoading(false);
      };
      
      // Read the file as an array buffer
      fileReader.readAsArrayBuffer(file);
      
    } catch (err) {
      console.error('Error with PDF extraction:', err);
      const error = err instanceof Error ? err : new Error('Failed to extract PDF text');
      setError(error);
      if (onError) onError(error);
      setLoading(false);
    }
  }, [file, onError, onExtracted, onProgress]);

  // Check when both scripts are loaded
  useEffect(() => {
    if (scriptsLoaded && workerScriptLoaded && file) {
      extractPdfText();
    }
  }, [scriptsLoaded, workerScriptLoaded, file, extractPdfText]);

  // Handle main PDF.js script load
  const handleMainScriptLoad = () => {
    setScriptsLoaded(true);
  };

  // Handle worker script load
  const handleWorkerScriptLoad = () => {
    setWorkerScriptLoaded(true);
  };

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
      
      {/* Load PDF.js main script */}
      <Script 
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        strategy="afterInteractive"
        onLoad={handleMainScriptLoad}
        onError={(e) => {
          console.error('Failed to load PDF.js script:', e);
          if (onError) onError(new Error('Failed to load PDF.js script'));
        }}
      />
      
      {/* Load PDF.js worker script - need to set worker source after it loads */}
      <Script 
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            handleWorkerScriptLoad();
          } else {
            console.error('PDF.js library not available when worker loaded');
          }
        }}
        onError={(e) => {
          console.error('Failed to load PDF.js worker script:', e);
          if (onError) onError(new Error('Failed to load PDF.js worker script'));
        }}
      />
    </>
  );
} 