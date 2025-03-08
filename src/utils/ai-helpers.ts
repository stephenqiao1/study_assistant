import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from "openai/helpers/zod";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Define the schema for AI-enhanced notes
const EnhancedNote = z.object({
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  summary: z.string().optional(),
  keyPoints: z.array(z.string()).optional(),
});

const EnhancedNotesResponse = z.object({
  notes: z.array(EnhancedNote)
});

// Define an interface for the raw note from OpenAI response
interface RawNote {
  title?: string;
  content?: string;
  tags?: string[] | unknown;
  [key: string]: unknown; // Allow for additional properties
}

/**
 * Processes raw text extracted from a PDF using AI to create structured, enhanced notes
 * @param text The raw text extracted from a PDF
 * @param filename The name of the PDF file (for context)
 * @param model The OpenAI model to use (default: gpt-4o-2024-08-06)
 * @param isRetry Whether this is a retry attempt (uses more conservative settings)
 * @param customSystemPrompt Additional instructions to add to the system prompt (optional)
 * @returns An array of enhanced notes with titles, content, tags, and more
 */
export async function processWithAI(
  text: string, 
  filename: string, 
  model: string = "gpt-4o-2024-08-06",
  isRetry: boolean = false,
  customSystemPrompt: string = ''
) {
  try {
    // If text is too long, truncate it to avoid token limits
    // GPT-4 can handle ~128k tokens, but we'll be conservative
    const maxChars = isRetry ? 40000 : 100000; // More conservative for retry attempts
    const truncatedText = text.length > maxChars 
      ? text.substring(0, maxChars) + "\n\n[Text truncated due to length]"
      : text;
    
    // Simplified system prompt for retry attempts to reduce complexity
    let systemPrompt = isRetry 
      ? `Extract the key information from this PDF text and create simple, organized notes.
         Preserve any LaTeX mathematical formulas exactly as they appear.
         The PDF filename is "${filename}".`
      : `You are an expert at analyzing academic content and creating structured notes.
You will be given text extracted from a PDF file named "${filename}".
Your task is to:
1. Organize this content into logical sections
2. Create well-structured notes with clear titles and formatted content
3. Generate relevant tags for each note
4. Identify key concepts and important points
5. Ensure the content is academically accurate and well-organized

IMPORTANT: If the text contains mathematical formulas, they will be in LaTeX format.
You MUST preserve all LaTeX formulas exactly as they appear. Do not modify or simplify them.
Example LaTeX formats to preserve:
- Inline math: $a^2 + b^2 = c^2$ or \\(E=mc^2\\)
- Display math: $$f(x) = \\int_{-\\infty}^{\\infty} \\hat{f}(\\xi)\\,e^{2 \\pi i \\xi x} \\,d\\xi$$ or \\[\\sum_{i=0}^n i^2 = \\frac{(n^2+n)(2n+1)}{6}\\]

The notes you create should follow academic best practices and be ready for study purposes.
If the text appears jumbled or poorly formatted, use your expertise to reorganize it into coherent notes.`;

    // Add custom system prompt if provided
    if (customSystemPrompt) {
      systemPrompt += customSystemPrompt;
    }
    
    // Call OpenAI to process the text
    const completion = await openai.beta.chat.completions.parse({
      model: model, // Use the specified model
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: truncatedText
        }
      ],
      response_format: zodResponseFormat(EnhancedNotesResponse, "enhancedNotesResponse")
    });

    // Ensure we have a valid response with parsed data
    if (!completion.choices[0]?.message?.parsed) {
      throw new Error("AI response did not contain properly parsed data");
    }
    
    // Return the parsed notes (now with proper type checking)
    return completion.choices[0].message.parsed.notes;
  } catch (error) {
    console.error("Error processing with AI:", error);
    throw new Error("Failed to process text with AI: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

/**
 * Processes text extracted from a document using OpenAI to create clean notes without HTML tags
 * @param text The raw text extracted from a document
 * @param fileName The name of the file (for context)
 * @param metadata Optional metadata about the document
 * @returns An array of notes with titles, content (without HTML tags), and tags
 */
export async function processDocumentWithOpenAI(
  text: string,
  fileName: string,
  metadata?: Record<string, unknown>
): Promise<{ title: string; content: string; tags: string[] }[]> {
  try {
    // If text is too long, truncate it to avoid token limits
    const maxChars = 100000;
    const truncatedText = text.length > maxChars 
      ? text.substring(0, maxChars) + "\n\n[Text truncated due to length]"
      : text;
    
    // Create a system prompt focused on clean text without HTML
    const systemPrompt = `You are an expert at analyzing documents and creating structured notes.
You will be given text extracted from a document named "${fileName}".

Your task is to:
1. Organize this content into logical sections
2. Create well-structured notes with clear titles and plain text content (NO HTML TAGS)
3. Generate relevant tags for each note (3-5 tags per note)
4. Ensure the content is accurate and well-organized
5. Group similar or related content together into cohesive notes

IMPORTANT REQUIREMENTS:
- DO NOT use any HTML tags in the content (no <p>, <br>, etc.)
- Use plain text formatting only with line breaks and spacing
- Format all mathematical formulas properly for LaTeX:
  - Inline formulas should be wrapped in single dollar signs: $formula$
  - Block/display formulas should be wrapped in double dollar signs: $$formula$$
  - Ensure all LaTeX syntax is correct (e.g., fractions as \\frac{num}{denom}, etc.)
- If the text appears jumbled, use your expertise to reorganize it into coherent notes
- Each note should be a standalone section with a clear title
- Group related content together rather than creating many small, fragmented notes
- Aim for 3-7 comprehensive notes rather than many small ones, unless the content is truly diverse

RESPONSE FORMAT:
- You MUST respond with a JSON object containing an array of notes
- Each note in the array should have: title, content, and tags fields
- Example JSON structure: {"notes": [{"title": "Section Title", "content": "Section content...", "tags": ["tag1", "tag2"]}]}

Document metadata: ${JSON.stringify(metadata || {})}`;
    
    // Call OpenAI to process the text
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: truncatedText
        }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the response
    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("Empty response from OpenAI");
    }
    
    try {
      const parsedResponse = JSON.parse(responseContent);
      if (!parsedResponse.notes || !Array.isArray(parsedResponse.notes)) {
        throw new Error("Invalid response format: missing notes array");
      }
      
      // Validate and clean each note
      return parsedResponse.notes.map((note: RawNote) => ({
        title: note.title || `${fileName} - Note`,
        content: note.content || "",
        tags: Array.isArray(note.tags) ? note.tags : ['imported', 'document']
      }));
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError);
      throw new Error("Failed to parse OpenAI response");
    }
  } catch (error) {
    console.error("Error processing document with OpenAI:", error);
    throw new Error("Failed to process document with OpenAI: " + (error instanceof Error ? error.message : "Unknown error"));
  }
} 