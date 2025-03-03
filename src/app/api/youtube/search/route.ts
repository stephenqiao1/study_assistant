import { NextResponse } from 'next/server'

// Get YouTube API key from environment variables
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    
    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }
    
    if (!YOUTUBE_API_KEY) {
      console.error('YouTube API key is not configured')
      // Return mock data in development if API key is not available
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          videos: [
            {
              id: 'mock-video-1',
              title: `Educational video about: ${query}`,
              description: 'This is a mock video for development purposes.',
              thumbnail: 'https://via.placeholder.com/480x360',
              channel: 'Development Channel',
              publishedAt: new Date().toISOString(),
              videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
            },
            {
              id: 'mock-video-2',
              title: `Tutorial: ${query} explained`,
              description: 'Another mock video for development.',
              thumbnail: 'https://via.placeholder.com/480x360',
              channel: 'Dev Learning',
              publishedAt: new Date().toISOString(),
              videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
            }
          ]
        })
      }
      
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
    
    // Define type for YouTube API response item
    interface YouTubeVideoItem {
      id: {
        videoId: string;
      };
      snippet: {
        title: string;
        description: string;
        thumbnails: {
          default?: { url: string };
          medium?: { url: string };
          high?: { url: string };
        };
        channelTitle: string;
        publishedAt: string;
      };
    }
    
    // Transform the YouTube API response to match our expected format
    const videos = data.items.map((item: YouTubeVideoItem) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      channel: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`
    }))
    
    return NextResponse.json({ videos })
  } catch (error) {
    console.error('Error in YouTube search API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 