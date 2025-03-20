import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';

// For Next.js 15+
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const maxDuration = 60; // Maximum allowed for hobby plan (60 seconds)

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Create a Supabase client
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // If not in development and no user, return unauthorized
    if (!isDevelopment && (!user || userError)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the form data with the image
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const prompt = formData.get('prompt') as string || 'Describe this image in detail and extract any text visible in it.';
    
    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Convert the file to a base64 string
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    const dataURI = `data:${imageFile.type};base64,${base64Image}`;

    // Define bucket name - we'll assume it already exists since you created it manually
    const bucketName = 'practice-question-images';
    
    // Upload the image to Supabase Storage
    const fileName = `${user?.id || 'dev'}-${Date.now()}-${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const { data: _uploadData, error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: imageFile.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return NextResponse.json(
        { error: `Failed to upload image: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get the public URL for the uploaded image
    const { data: { publicUrl } } = supabase
      .storage
      .from(bucketName)
      .getPublicUrl(fileName);

    // Analyze the image with OpenAI Vision API
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: dataURI,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 500
      });

      // Extract the analysis from the response
      const analysis = response.choices[0]?.message?.content || 'No analysis available';

      // Return the analysis and image URL
      return NextResponse.json({
        analysis,
        imageUrl: publicUrl
      });
    } catch (openAiError) {
      console.error('OpenAI API error:', openAiError);
      return NextResponse.json(
        { 
          error: `OpenAI API error: ${openAiError instanceof Error ? openAiError.message : 'Unknown error'}`,
          details: openAiError
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error analyzing image:', error);
    return NextResponse.json(
      { error: `Failed to analyze image: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 