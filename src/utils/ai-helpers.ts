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