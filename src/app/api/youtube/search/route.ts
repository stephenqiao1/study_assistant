import { NextResponse } from 'next/server'

// Get YouTube API key from environment variables
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    
    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }
    
    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: 'YouTube API key is not configured' },
        { status: 403 }
      )
    }
    
    // Fetch videos from YouTube API
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}&relevanceLanguage=en&videoEmbeddable=true&safeSearch=strict&videoCategoryId=27`,
      { next: { revalidate: 60 * 60 } } // Cache for 1 hour
    )
    
    if (!response.ok) {
      console.error('YouTube API error:', response.status, await response.text())
      return NextResponse.json(
        { error: 'Failed to fetch videos from YouTube' },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in YouTube search API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 