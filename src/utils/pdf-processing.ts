import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';

// Set maximum file size to 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Define a type for PDF metadata
interface PdfMetadata {
  numPages?: number;
  title?: string;
  author?: string;
  [key: string]: unknown;
}

// Enhanced helper function to split text into sections based on headings or patterns
function splitIntoSections(text: string, fileName: string, metadata?: PdfMetadata): { title: string, content: string, tags: string[] }[] {
  // Clean up and normalize the text
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n') // Normalize excessive line breaks
    .trim();
  
  // Try to identify section headers using improved patterns
  // This regex looks for potential headers: capitalized lines, numbered sections, etc.
  const headerRegex = /\n(?=[A-Z0-9][A-Z0-9 \t.:]{0,50}(?:\n|\r\n))|(?:\n+(?:[0-9]+\.|\([0-9]+\)|\[[0-9]+\]|Chapter|Section|Part) )/g;
  
  // Split by potential headers
  const sections = cleanedText.split(headerRegex);
  
  // Clean up sections and create notes array
  const notes = [];
  
  // Use metadata if available for better sectioning
  const pageCount = metadata?.numPages || 1;
  const estimatedSectionCount = Math.max(3, Math.min(20, Math.ceil(pageCount / 2)));
  
  // If we couldn't split effectively (only one big section or too many tiny ones)
  if (sections.length === 1 || sections.length > 50) {
    // Try another approach: split by pages or by paragraphs
    if (sections.length === 1) {
      // If we have one large section, try splitting by paragraphs
      const paragraphs = cleanedText.split(/\n\s*\n/);
      
      // Group paragraphs into reasonable chunks based on document size
      const chunkSize = Math.max(3, Math.min(7, Math.ceil(paragraphs.length / estimatedSectionCount)));
      
      for (let i = 0; i < paragraphs.length; i += chunkSize) {
        const chunk = paragraphs.slice(i, i + chunkSize);
        const content = chunk.join('\n\n');
        
        // Try to extract a meaningful title from the first paragraph
        let title = chunk[0].trim().split(/[.!?]/)[0];
        if (title.length > 60 || title.length < 10) {
          title = `${fileName} - Part ${Math.floor(i / chunkSize) + 1}`;
        }
        
        notes.push({
          title: title,
          content: content.replace(/\n/g, '<br>'),
          tags: ['pdf', 'imported']
        });
      }
    } else {
      // If we have too many small sections, merge them into reasonable chunks
      const chunkSize = Math.ceil(sections.length / estimatedSectionCount);
      
      for (let i = 0; i < sections.length; i += chunkSize) {
        const chunk = sections.slice(i, i + chunkSize);
        const content = chunk.join('\n');
        
        // Try to extract a meaningful title from the first chunk
        let title = chunk[0].trim().split(/[.!?]/)[0];
        if (title.length > 60 || title.length < 10) {
          title = `${fileName} - Part ${Math.floor(i / chunkSize) + 1}`;
        }
        
        notes.push({
          title: title,
          content: content.replace(/\n/g, '<br>'),
          tags: ['pdf', 'imported']
        });
      }
    }
  } else {
    // Process each section into a note with improved title extraction
    sections.forEach((section, index) => {
      // Skip empty sections
      if (!section.trim()) return;
      
      // Extract the first line as a potential title
      const lines = section.split('\n');
      let title = lines[0].trim();
      let content = section.trim();
      
      // Improved title extraction logic
      if (title.length > 60) {
        // Try to extract a shorter title from the first sentence
        const firstSentence = title.split(/[.!?]/)[0];
        if (firstSentence.length <= 60 && firstSentence.length >= 3) {
          title = firstSentence.trim();
        } else {
          title = `${fileName} - Section ${index + 1}`;
        }
      } else if (title.length < 3) {
        title = `${fileName} - Section ${index + 1}`;
      } else {
        // Remove the title line from content if we're using it as the title
        content = lines.slice(1).join('\n').trim();
      }
      
      // Enhanced content processing to maintain structure better
      const processedContent = content
        .replace(/\n/g, '<br>')
        .replace(/<br><br>/g, '</p><p>') // Convert double line breaks to paragraphs
        .replace(/([.!?])<br>/g, '$1</p><p>'); // Try to break at sentences too
      
      const finalContent = `<p>${processedContent}</p>`;
      
      notes.push({
        title: title,
        content: finalContent,
        tags: ['pdf', 'imported']
      });
    });
  }
  
  // If we somehow ended up with no notes, create at least one
  if (notes.length === 0) {
    notes.push({
      title: fileName,
      content: `<p>${cleanedText.replace(/\n/g, '<br>')}</p>`,
      tags: ['pdf', 'imported']
    });
  }
  
  return notes;
}

// The actual implementation that gets executed at runtime only
export async function processPostRequest(request: NextRequest) {
  try {
    // Process form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const studySessionId = formData.get('studySessionId') as string;
    const _useAI = formData.get('useAI') === 'true';
    const isClientExtracted = formData.get('isClientExtracted') === 'true';
    const clientExtractedText = formData.get('extractedText') as string;
    const clientExtractedMetadata = formData.get('metadata') ? JSON.parse(formData.get('metadata') as string) : null;
    
    if (!file || !studySessionId) {
      return NextResponse.json(
        { error: 'Missing file or study session ID' },
        { status: 400 }
      );
    }
    
    // Verify file type and size
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 413 }
      );
    }
    
    // Get the filename without extension for use in note titles
    const fileName = file.name.replace(/\.pdf$/i, '');
    
    // If the client already extracted the text, use that to save processing time
    if (isClientExtracted && clientExtractedText) {
      
      // Split the PDF content into multiple notes
      const notes = splitIntoSections(clientExtractedText, fileName, clientExtractedMetadata);
      
      return NextResponse.json({
        notes,
        meta: {
          filename: file.name,
          fileSize: file.size,
          noteCount: notes.length,
          textLength: clientExtractedText.length,
          enhancedWithAI: false,
          clientExtracted: true
        }
      });
    }
    
    // Otherwise, extract text from PDF server-side
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfData = await pdfParse(buffer);
      const extractedText = pdfData.text;
      const metadata = {
        numPages: pdfData.numpages,
        info: pdfData.info
      };
      
      // Split the PDF content into multiple notes
      const notes = splitIntoSections(extractedText, fileName, metadata);
      
      return NextResponse.json({
        notes,
        meta: {
          filename: file.name,
          fileSize: file.size,
          noteCount: notes.length,
          textLength: extractedText.length,
          enhancedWithAI: false,
          clientExtracted: false,
          pages: pdfData.numpages
        }
      });
    } catch (error) {
      console.error('Error processing PDF:', error);
      
      // Return a fallback note
      const notes = [{
        title: file.name.replace('.pdf', ''),
        content: "<p>Could not extract content from this PDF. It may be protected or contain only images.</p>",
        tags: ['pdf', 'import-failed']
      }];
      
      return NextResponse.json({
        notes,
        meta: {
          filename: file.name,
          fileSize: file.size,
          noteCount: 1,
          usedFallback: true
        }
      });
    }
  } catch (error) {
    console.error('Error in PDF extract route:', error);
    return NextResponse.json(
      { error: 'Server error processing PDF' },
      { status: 500 }
    );
  }
} 