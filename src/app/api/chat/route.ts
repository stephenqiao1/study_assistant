import { NextResponse } from 'next/server'
import OpenAI from 'openai'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatResponse {
  message: string
  encouragement: string
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const SYSTEM_PROMPT = `You are a curious and engaged virtual student having a text conversation to learn more about the topic. Your role is to:

1. First, carefully read and understand the original content being explained.

2. Based on the content, analyze for:
   - Key concepts that need clarification
   - Important relationships between ideas
   - Real-world applications of the concepts
   - Potential misconceptions to address
   - Areas where examples would help understanding

3. Ask questions that:
   - Directly relate to specific points in the content
   - Help explore the deeper implications of the concepts
   - Connect different parts of the material
   - Challenge common misconceptions
   - Request practical examples or applications

4. Keep your questions:
   - Focused on the actual content (don't introduce unrelated topics)
   - Specific rather than general
   - Natural and conversational in tone
   - Aimed at deepening understanding

IMPORTANT: 
- Send only ONE message at a time, as if you're texting back and forth
- Always reference specific concepts from the original content
- Stay within the scope of what's being taught
- Don't introduce concepts that aren't related to the material

Your response should feel like a natural chat message that encourages further discussion of the specific content being studied.

Always respond in this JSON format:
{
  "message": "your single conversational message here",
  "encouragement": "a brief encouraging comment about their explanation"
}`

// Function to ensure we only get one message
function extractSingleMessage(text: string): string {
  // Remove any numbered lists (1., 2., etc.)
  const withoutNumbers = text.replace(/^\d+\.\s*/gm, '');
  
  // Split by common sentence endings followed by whitespace or end of string
  const sentences = withoutNumbers.split(/[.!?](?:\s+|$)/);
  
  // Take the first complete thought, add back appropriate punctuation
  if (sentences.length > 1) {
    const firstSentence = sentences[0].trim();
    // Determine the original punctuation used
    const punctuation = text.match(/[.!?]/)?.[0] || '?';
    return firstSentence + punctuation;
  }
  
  return text.trim();
}

// Function to check if text contains a question
function containsQuestion(text: string): boolean {
  // Check for question marks
  if (text.includes('?')) return true;
  
  // Check for common question words/phrases
  const questionWords = [
    'what', 'why', 'how', 'when', 'where', 'who', 'which',
    'can you', 'could you', 'would you', 'tell me'
  ];
  
  const lowerText = text.toLowerCase();
  return questionWords.some(word => lowerText.includes(word));
}

const FOLLOW_UP_PROMPT = `Based on the previous conversation and the original content being explained, ask ONE specific follow-up question that:
- Directly relates to the concepts in the original content
- Builds on the previous discussion
- Helps explore the topic in more depth
- Stays focused on the material being studied

Your response should be in JSON format:
{
  "message": "your question here",
  "encouragement": "a brief encouraging comment"
}`

export async function POST(request: Request) {
  try {
    const { messages, originalContent } = await request.json()
    
    // Debug logging
    console.log('Received content:', {
      contentLength: originalContent?.length || 0,
      content: originalContent?.substring(0, 100) + '...',
      messagesCount: messages?.length || 0
    })

    if (!originalContent || originalContent.trim() === '') {
      return NextResponse.json({
        questions: ['I need the study material to provide relevant questions. Could you please make sure the content is being loaded correctly?'],
        encouragement: 'Once I have the content, I can help you study more effectively!'
      })
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "system",
          content: `Here is the study material you need to focus on:\n\n${originalContent}\n\nMake sure your questions are specifically about this content.`
        },
        ...messages.map((msg: Message) => ({
          role: msg.role,
          content: msg.content
        }))
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    })
    
    const aiResponse = JSON.parse(completion.choices[0].message.content || '{"message": "", "encouragement": ""}') as ChatResponse
    
    // Process the message to ensure we only get one
    const singleMessage = extractSingleMessage(aiResponse.message || "")

    // If the message doesn't contain a question, get a follow-up question
    if (!containsQuestion(singleMessage)) {
      
      const followUp = await openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: [
          {
            role: "system",
            content: FOLLOW_UP_PROMPT
          },
          {
            role: "system",
            content: `Here is the study material you need to focus on:\n\n${originalContent}\n\nMake sure your questions are specifically about this content.`
          },
          ...messages.map((msg: Message) => ({
            role: msg.role,
            content: msg.content
          })),
          {
            role: "assistant",
            content: singleMessage
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      })

      const followUpResponse = JSON.parse(followUp.choices[0].message.content || '{"message": "", "encouragement": ""}') as ChatResponse

      // Return both messages
      const response = {
        questions: [singleMessage, followUpResponse.message],
        encouragement: aiResponse.encouragement || ""
      }
      
      return NextResponse.json(response)
    }
    
    // If original message contains a question, just return it
    const response = {
      questions: [singleMessage],
      encouragement: aiResponse.encouragement || ""
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in chat API:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate response',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 