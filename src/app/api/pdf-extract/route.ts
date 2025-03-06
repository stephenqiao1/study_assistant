import { NextRequest, NextResponse } from 'next/server';
import _pdfParse from 'pdf-parse';

// Set maximum file size to 10MB
const _MAX_FILE_SIZE = 10 * 1024 * 1024;

// For Next.js 15+
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const maxDuration = 60; // Maximum allowed for hobby plan (60 seconds)

// Prevent Next.js from executing this route at build time
export function GET() {
  return NextResponse.json({ message: 'This API route requires a POST request with a PDF file' });
}

// Define a type for PDF metadata
interface PdfMetadata {
  numPages?: number;
  title?: string;
  author?: string;
  [key: string]: unknown;
}

// Enhanced helper function to split text into sections based on headings or patterns
function _splitIntoSections(text: string, fileName: string, metadata?: PdfMetadata): { title: string, content: string, tags: string[] }[] {
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

// Updated to use the new App Router API route format for Next.js 15+
export async function POST(request: NextRequest) {
  try {
    // Only import pdf-parse at runtime, not during build
    if (typeof window === 'undefined' && request?.body) {
      // Dynamically import the actual implementation
      const { processPostRequest } = await import('@/utils/pdf-processing');
      return processPostRequest(request);
    }
    
    // Return a simple response during build time
    return NextResponse.json({ message: 'PDF processing is only available at runtime' });
  } catch (error) {
    console.error('Error in PDF extract route:', error);
    return NextResponse.json(
      { error: 'Server error processing PDF' },
      { status: 500 }
    );
  }
} 