import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { APIError } from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Supported audio formats
const SUPPORTED_FORMATS = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm']
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB in bytes

interface WhisperResponse {
  text: string
  words?: Array<{ word: string, start: number, end: number }>
  segments?: Array<{ text: string, start: number, end: number }>
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const prompt = formData.get('prompt') as string || ''
    const language = formData.get('language') as string || 'en'
    const timestamp = formData.get('timestamp') === 'true'

    // Validate file presence
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 25MB limit' },
        { status: 400 }
      )
    }

    // Validate file format
    const fileExtension = audioFile.name.split('.').pop()?.toLowerCase()
    if (!fileExtension || !SUPPORTED_FORMATS.includes(fileExtension)) {
      return NextResponse.json(
        { 
          error: 'Unsupported file format',
          supported_formats: SUPPORTED_FORMATS 
        },
        { status: 400 }
      )
    }

    // Convert the File to a Buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Configure transcription options
    const transcriptionOptions: OpenAI.Audio.TranscriptionCreateParams = {
      file: new File([buffer], audioFile.name, { type: audioFile.type }),
      model: 'whisper-1',
      language,
      prompt,
    }

    // Add timestamp options if requested
    if (timestamp) {
      transcriptionOptions.response_format = 'verbose_json'
      transcriptionOptions.timestamp_granularities = ['word']
    }

    const transcription = await openai.audio.transcriptions.create(transcriptionOptions) as WhisperResponse

    // Return appropriate response based on format
    if (timestamp) {
      return NextResponse.json({
        text: transcription.text,
        words: transcription.words || [],
        segments: transcription.segments || []
      })
    }

    return NextResponse.json({ text: transcription.text })
  } catch (error: unknown) {
    console.error('Error in transcription API:', error)
    
    // Handle specific OpenAI API errors
    if (error instanceof APIError && error.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        error: 'Failed to transcribe audio',
        details: errorMessage
      },
      { status: 500 }
    )
  }
} 