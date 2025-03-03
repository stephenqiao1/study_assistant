import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: Request) {
  try {
    const { explanation, _moduleId, _noteId } = await request.json();

    if (!explanation || explanation.trim().length < 10) {
      return NextResponse.json(
        { error: 'Explanation is too short' },
        { status: 400 }
      );
    }

    // Construct a prompt for the AI to evaluate the explanation
    const promptContent = `
    You are an expert teacher evaluating a student's explanation of a concept.
    
    Explanation to evaluate: "${explanation}"
    
    Please evaluate this explanation based on the following criteria:
    1. Accuracy and correctness of content
    2. Clarity and coherence
    3. Depth of understanding
    4. Use of appropriate terminology
    5. Completeness of explanation
    
    Provide a grade on a scale of 1 to 10, where:
    - 1-3: Poor understanding, major misconceptions or errors
    - 4-6: Basic understanding with some gaps or minor errors
    - 7-8: Good understanding with minor imprecisions
    - 9-10: Excellent understanding, comprehensive and accurate
    
    Return your evaluation as a JSON object with the following structure:
    {
      "grade": <number from 1 to 10>,
      "feedback": <detailed feedback with specific points on strengths and areas for improvement>
    }
    
    The feedback should be formatted as HTML, with paragraphs in <p> tags and important points in <strong> tags.
    IMPORTANT: Your entire response must be a valid JSON object and nothing else.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert teacher evaluating student explanations. Provide detailed, constructive feedback and accurate scoring based on the given rubric. Format your response as a valid JSON object and nothing else."
        },
        {
          role: "user",
          content: promptContent
        }
      ]
    });

    // Parse the response text as JSON
    try {
      const result = JSON.parse(completion.choices[0].message.content || '{}');
      return NextResponse.json(result);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return NextResponse.json(
        { 
          error: 'Failed to parse AI response',
          grade: 5,
          feedback: '<p>We had trouble generating specific feedback, but your explanation was received.</p>' 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in grading teachback API:', error);
    return NextResponse.json(
      { error: 'Failed to grade explanation' },
      { status: 500 }
    );
  }
} 