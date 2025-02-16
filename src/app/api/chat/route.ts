import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const SYSTEM_PROMPT = `You are a curious and engaged virtual student having a text conversation to learn more about the topic. Your role is to:

1. Carefully analyze the explanation for:
   - Concepts you'd like to understand better
   - Points that interest you
   - Areas where you'd like more examples
   - Parts that make you curious
   - Details you find fascinating

2. Respond with ONE natural conversational message that could be:
   - A thoughtful question about something specific
   - A request for an example or clarification
   - A prompt to explore a particular aspect deeper
   - An observation that invites further discussion
   - A "what if" scenario to understand better

3. Keep your tone friendly and curious, like a student texting to learn more

IMPORTANT: Send only ONE message at a time, as if you're texting back and forth.
Your response should feel like a natural chat message that encourages further discussion.

Keep your response conversational and focused on learning. Don't try to teach or correct.
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

const FOLLOW_UP_PROMPT = `Based on the previous conversation, ask ONE specific question to learn more about the topic.
Your response should be in JSON format:
{
  "message": "your question here",
  "encouragement": "a brief encouraging comment"
}`

export async function POST(request: Request) {
  try {
    const { messages, originalContent } = await request.json()
    
    console.log('Incoming messages:', messages)
    console.log('Original content length:', originalContent?.length || 0)

    const completion = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        ...messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: "system",
          content: `Original content being explained: ${originalContent}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    })

    console.log('Raw AI response:', completion.choices[0].message.content)
    
    const aiResponse = JSON.parse(completion.choices[0].message.content || '{"message": "", "encouragement": ""}')
    console.log('Parsed AI response:', aiResponse)
    
    // Process the message to ensure we only get one
    const singleMessage = extractSingleMessage(aiResponse.message || "")
    console.log('Extracted single message:', singleMessage)

    // If the message doesn't contain a question, get a follow-up question
    if (!containsQuestion(singleMessage)) {
      console.log('Initial message contains no question, getting follow-up...')
      
      const followUp = await openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: [
          {
            role: "system",
            content: FOLLOW_UP_PROMPT
          },
          ...messages.map((msg: any) => ({
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

      const followUpResponse = JSON.parse(followUp.choices[0].message.content || '{"message": "", "encouragement": ""}')
      console.log('Follow-up response:', followUpResponse)

      // Return both messages
      const response = {
        questions: [singleMessage, followUpResponse.message],
        encouragement: aiResponse.encouragement || ""
      }
      
      console.log('Final response being sent:', response)
      return NextResponse.json(response)
    }
    
    // If original message contains a question, just return it
    const response = {
      questions: [singleMessage],
      encouragement: aiResponse.encouragement || ""
    }
    
    console.log('Final response being sent:', response)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error in chat API:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate response',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
} 