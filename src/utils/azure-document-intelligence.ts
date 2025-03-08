import { AzureKeyCredential, DocumentAnalysisClient } from "@azure/ai-form-recognizer";

// Define types for document line with optional boundingBox (prefixed with _ as it's not currently used)
interface _DocumentLineWithBoundingBox {
  content: string;
  boundingBox?: number[];
  [key: string]: unknown; // Replace 'any' with 'unknown' for better type safety
}

// Azure Document Intelligence client
let documentIntelligenceClient: DocumentAnalysisClient | null = null;

/**
 * Initialize the Azure Document Intelligence client
 */
export const initDocumentIntelligenceClient = () => {
  if (documentIntelligenceClient) return documentIntelligenceClient;

  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

  if (!endpoint || !key) {
    throw new Error("Azure Document Intelligence credentials not found in environment variables");
  }

  documentIntelligenceClient = new DocumentAnalysisClient(
    endpoint,
    new AzureKeyCredential(key)
  );

  return documentIntelligenceClient;
};

/**
 * Extract text from a PDF or image file using Azure Document Intelligence
 * Optimized to handle both printed and handwritten text
 * @param fileBuffer The file buffer to analyze
 * @param fileName The name of the file (for context and determining file type)
 */
export const extractTextFromDocument = async (
  fileBuffer: Buffer,
  _fileName: string
): Promise<{ text: string; metadata: Record<string, unknown> }> => {
  try {
    const client = initDocumentIntelligenceClient();
    
    // Use the Read model for text extraction (handles both printed and handwritten text)
    const poller = await client.beginAnalyzeDocument("prebuilt-read", fileBuffer);
    const result = await poller.pollUntilDone();

    if (!result || !result.pages || result.pages.length === 0) {
      throw new Error("No text content found in document");
    }

    // Extract text content from all pages
    let extractedText = "";
    const resultWithDocType = result as unknown as { docType?: string };
    const metadata: Record<string, unknown> = {
      pageCount: result.pages.length,
      languages: result.languages,
      documentType: resultWithDocType.docType || "unknown"
    };

    // Process each page
    for (const page of result.pages) {
      // Add page number as a header
      extractedText += `\n--- Page ${page.pageNumber} ---\n\n`;
      
      // Extract lines of text with confidence scores
      for (const line of page.lines || []) {
        // Include confidence score for text that might be uncertain
        const lineWithConfidence = line as unknown as { confidence?: number };
        const confidence = lineWithConfidence.confidence !== undefined && lineWithConfidence.confidence < 0.8 
          ? ` (confidence: ${(lineWithConfidence.confidence * 100).toFixed(1)}%)` 
          : '';
        extractedText += line.content + confidence + "\n";
      }
      
      extractedText += "\n";
    }

    return {
      text: extractedText.trim(),
      metadata
    };
  } catch (error) {
    console.error("Error extracting text with Azure Document Intelligence:", error);
    throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Extract text and layout information from a PDF or image file
 * This provides more detailed information about the document structure
 * Optimized to handle both printed and handwritten text
 * @param fileBuffer The file buffer to analyze
 * @param fileName The name of the file
 */
export const extractDocumentLayout = async (
  fileBuffer: Buffer,
  _fileName: string
): Promise<{ text: string; metadata: Record<string, unknown> }> => {
  try {
    const client = initDocumentIntelligenceClient();
    
    // Use the Layout model for more detailed extraction
    // This model handles both printed and handwritten text
    const poller = await client.beginAnalyzeDocument("prebuilt-layout", fileBuffer);
    const result = await poller.pollUntilDone();

    if (!result || !result.pages || result.pages.length === 0) {
      throw new Error("No content found in document");
    }

    // Extract text content with structure awareness
    let extractedText = "";
    const resultWithDocType = result as unknown as { docType?: string };
    const metadata: Record<string, unknown> = {
      pageCount: result.pages.length,
      languages: result.languages,
      documentType: resultWithDocType.docType || "unknown",
      tables: result.tables?.length || 0,
      paragraphs: 0,
      hasFormElements: result.styles && result.styles.length > 0
    };

    // Process tables if present
    if (result.tables && result.tables.length > 0) {
      extractedText += "## Tables\n\n";
      
      for (let i = 0; i < result.tables.length; i++) {
        const table = result.tables[i];
        extractedText += `### Table ${i + 1}\n\n`;
        
        // Process each cell in the table
        const tableData: string[][] = [];
        
        // Initialize the table data structure
        for (let row = 0; row < table.rowCount; row++) {
          tableData[row] = [];
          for (let col = 0; col < table.columnCount; col++) {
            tableData[row][col] = "";
          }
        }
        
        // Fill in the table data
        for (const cell of table.cells) {
          if (cell.rowIndex !== undefined && cell.columnIndex !== undefined && cell.content) {
            tableData[cell.rowIndex][cell.columnIndex] = cell.content;
          }
        }
        
        // Convert to markdown table format
        for (const row of tableData) {
          extractedText += "| " + row.join(" | ") + " |\n";
        }
        
        extractedText += "\n\n";
      }
    }

    // Process paragraphs and general content
    extractedText += "## Content\n\n";
    
    // Process each page
    for (const page of result.pages) {
      extractedText += `### Page ${page.pageNumber}\n\n`;
      
      // Group lines into paragraphs based on position and style
      let currentParagraph = "";
      let lastY = -1;
      const paragraphs: string[] = [];
      
      // Safely process lines with proper type checking
      for (const line of page.lines || []) {
        // Get the content (this should always be available)
        const content = line.content || "";
        
        // Check if we have valid boundingBox data for paragraph detection
        const lineWithBoundingBox = line as unknown as { boundingBox?: number[] };
        const boundingBox = lineWithBoundingBox.boundingBox;
        const hasValidBoundingBox = boundingBox && Array.isArray(boundingBox) && boundingBox.length > 1;
        
        if (hasValidBoundingBox) {
          // If we have valid position data, use it for paragraph detection
          const yPosition = boundingBox[1];
          
          // Simple paragraph detection - if Y position is significantly different, it's a new paragraph
          if (lastY !== -1 && Math.abs(yPosition - lastY) > 15) {
            if (currentParagraph) {
              paragraphs.push(currentParagraph);
              currentParagraph = "";
              metadata.paragraphs = (metadata.paragraphs as number) + 1;
            }
          }
          
          currentParagraph += (currentParagraph ? " " : "") + content;
          lastY = yPosition;
        } else {
          // If no valid boundingBox, just add the content without paragraph detection
          currentParagraph += (currentParagraph ? " " : "") + content;
        }
      }
      
      // Add the last paragraph
      if (currentParagraph) {
        paragraphs.push(currentParagraph);
        metadata.paragraphs = (metadata.paragraphs as number) + 1;
      }
      
      // Add paragraphs to extracted text
      extractedText += paragraphs.join("\n\n") + "\n\n";
    }

    return {
      text: extractedText.trim(),
      metadata
    };
  } catch (error) {
    console.error("Error extracting layout with Azure Document Intelligence:", error);
    throw new Error(`Failed to extract document layout: ${error instanceof Error ? error.message : String(error)}`);
  }
}; 