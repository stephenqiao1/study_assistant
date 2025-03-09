'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { ArrowLeft, Search, Bookmark, ExternalLink, CircleSlash, Loader2 } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { useToast } from "@/components/ui/use-toast"
import { useSearchParams, useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useStudyDuration } from '@/hooks/useStudyDuration'
import { isPremiumUser } from '@/utils/subscription-helpers'
import Image from 'next/image'

interface PageProps {
  params: Promise<{ moduleId: string }>
}

interface NoteType {
  id: string
  title: string
  content: string
  tags: string[]
  created_at: string
  updated_at: string
}

interface VideoType {
  id: string
  title: string
  description: string
  thumbnail: string
  channel: string
  publishedAt: string
  videoUrl: string
  bookmarked?: boolean
}

interface SavedVideoType {
  id: string
  video_id: string
  title: string
  description: string
  thumbnail: string
  channel: string
  published_at: string
  video_url: string
  note_id?: string
  user_id: string
  module_title: string
  saved_at: string
}

interface ModuleType {
  id: string
  module_title: string
  details: {
    title: string
    description?: string
  }
}

interface YouTubeVideoItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      medium: {
        url: string;
      };
    };
    channelTitle: string;
    publishedAt: string;
  };
}

export default function VideosPage({ params }: PageProps) {
  // Unwrap the params Promise with React.use()
  const resolvedParams = use(params);
  const { moduleId } = resolvedParams;
  
  const { session, isLoading: isLoadingAuth } = useRequireAuth()
  const _router = useRouter()
  const searchParams = useSearchParams()
  const noteId = searchParams.get('noteId')
  const { toast } = useToast()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [videos, setVideos] = useState<VideoType[]>([])
  const [savedVideos, setSavedVideos] = useState<SavedVideoType[]>([])
  const [notes, setNotes] = useState<NoteType[]>([])
  const [selectedNote, setSelectedNote] = useState<NoteType | null>(null)
  const [showSavedOnly, setShowSavedOnly] = useState(false)
  const [studySessionId, setStudySessionId] = useState<string | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [showApiKeyMissing, setShowApiKeyMissing] = useState(false)
  const [moduleData, setModuleData] = useState<ModuleType | null>(null)
  const [initialSearchPerformed, setInitialSearchPerformed] = useState(false)
  const [_isSearchMode, setIsSearchMode] = useState(false)
  
  // Track study duration
  useStudyDuration(studySessionId || '', 'module')
  
  // Function to perform a YouTube search
  const performSearch = useCallback(async (query: string) => {
    try {
      // Make the API call to the server endpoint
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`)
      
      if (!response.ok) {
        if (response.status === 403) {
          setShowApiKeyMissing(true)
          throw new Error('YouTube API key is missing or invalid')
        }
        throw new Error(`Error searching videos: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Transform the data
      const formattedVideos = data.items.map((item: YouTubeVideoItem) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium.url,
        channel: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        bookmarked: savedVideos.some(sv => sv.video_id === item.id.videoId)
      }))
      
      setVideos(formattedVideos)
      setIsSearchMode(true)
      
      toast({
        title: "Search Complete",
        description: `Found ${formattedVideos.length} videos for "${query}"`,
      })
    } catch (error) {
      console.error('Search error:', error)
      toast({
        title: "Search Error",
        description: "There was a problem searching for videos. Please try again.",
        variant: "destructive"
      })
      throw error;
    } finally {
      setIsSearching(false)
    }
  }, [savedVideos, toast]);
  
  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user?.id) return
      
      const supabase = await createClient()
      
      try {
        // Check if user is premium
        const userIsPremium = await isPremiumUser(session.user.id)
        setIsPremium(userIsPremium)
        
        // Check if moduleId is a valid UUID
        const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(moduleId);
        
        if (!isValidUuid) {
          console.error('Invalid module ID format:', moduleId);
          throw new Error('Invalid module ID format');
        }
        
        // Fetch module data using moduleId directly as the study_session_id
        const { data: studySession, error: sessionError } = await supabase
          .from('study_sessions')
          .select('id, module_title, details')
          .eq('id', moduleId)
          .single()
          
        if (sessionError) {
          console.error('Error fetching study session:', sessionError);
          throw sessionError;
        }
        
        setStudySessionId(studySession.id)
        setModuleData(studySession)
        
        // Fetch notes for this module
        const { data: noteData, error: noteError } = await supabase
          .from('notes')
          .select('*')
          .eq('study_session_id', studySession.id)
          .order('updated_at', { ascending: false })
          
        if (noteError) throw noteError
        if (noteData) {
          setNotes(noteData)
          
          // If noteId is provided, set the selected note
          if (noteId) {
            const note = noteData.find(n => n.id === noteId)
            if (note) {
              setSelectedNote(note)
              setSearchQuery(note.title) // Pre-populate search with note title
            }
          }
        }
        
        // Fetch saved videos
        const { data: savedVideoData, error: savedVideoError } = await supabase
          .from('saved_videos')
          .select('*')
          .eq('study_session_id', studySession.id)
          .eq('user_id', session.user.id)
          .order('saved_at', { ascending: false })
          
        if (savedVideoError) throw savedVideoError
        if (savedVideoData) {
          setSavedVideos(savedVideoData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [moduleId, session, noteId])
  
  // Automatically perform initial search when page loads
  useEffect(() => {
    const performInitialSearch = async () => {
      if (isLoading || initialSearchPerformed || showSavedOnly) return
      
      // If a noteId was provided, that search will be handled by the main data fetching effect
      if (noteId) {
        setInitialSearchPerformed(true)
        return
      }
      
      setIsSearching(true)
      
      try {
        let searchTerm = '';
        
        // For premium users, generate a more targeted search term
        if (isPremium && notes.length > 0) {
          // Combine the most recent note titles (up to 3)
          const recentNotes = notes.slice(0, 3);
          const noteContent = recentNotes.map(note => note.title).join(' ');
          
          // Generate keywords from notes using AI
          try {
            const response = await fetch('/api/openai/generate-search-query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: noteContent,
                prompt: `Based on these note titles, generate a concise YouTube search query (5-10 words) that would find educational videos about the main concepts. ONLY return the search query text, no other text.`
              })
            });
            
            if (response.ok) {
              const data = await response.json();
              searchTerm = data.result.trim();
            }
          } catch (error) {
            console.error('Error generating search query:', error);
            // Fall back to basic search
            searchTerm = moduleData?.details?.title || moduleId;
          }
        } else {
          // For non-premium users or if no notes, use module title
          searchTerm = moduleData?.details?.title || moduleId;
        }
        
        setSearchQuery(searchTerm);
        await performSearch(searchTerm);
        setInitialSearchPerformed(true);
      } catch (error) {
        console.error('Error performing initial search:', error);
      } finally {
        setIsSearching(false);
      }
    };
    
    performInitialSearch();
  }, [isLoading, moduleData, notes, isPremium, noteId, showSavedOnly, initialSearchPerformed, moduleId, performSearch]);
  
  // Handle searching for videos
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setIsSearching(true)
    
    try {
      await performSearch(searchQuery)
    } catch (error) {
      console.error('Error searching videos:', error)
      toast({
        title: "Error Searching Videos",
        description: "There was a problem finding videos. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSearching(false)
    }
  }
  
  // Handle saving a video
  const handleSaveVideo = async (video: VideoType) => {
    if (!session?.user?.id || !studySessionId) return
    
    const supabase = await createClient()
    
    try {
      // Check if this video is already saved - Modified approach to avoid 406 error
      const { data: existingVideos, error: checkError } = await supabase
        .from('saved_videos')
        .select('*')
        .eq('video_id', video.id)
        .eq('user_id', session.user.id)
        .eq('study_session_id', studySessionId)
        
      // Check if we found any videos - we expect at most one due to unique constraint
      if (!checkError && existingVideos && existingVideos.length > 0) {
        const existingVideo = existingVideos[0]
        
        // Video already saved, so unsave it
        const { error: deleteError } = await supabase
          .from('saved_videos')
          .delete()
          .eq('id', existingVideo.id)
          
        if (deleteError) throw deleteError
        
        // Update local state
        setSavedVideos(prev => prev.filter(v => v.id !== existingVideo.id))
        setVideos(prev => 
          prev.map(v => 
            v.id === video.id 
              ? { ...v, bookmarked: false } 
              : v
          )
        )
        
        toast({
          title: "Video Removed",
          description: "The video has been removed from your saved videos."
        })
      } else {
        // Save the video
        const { data: savedVideo, error: saveError } = await supabase
          .from('saved_videos')
          .insert({
            video_id: video.id,
            title: video.title,
            description: video.description,
            thumbnail: video.thumbnail,
            channel: video.channel,
            published_at: video.publishedAt,
            video_url: video.videoUrl,
            note_id: selectedNote?.id || null,
            user_id: session.user.id,
            study_session_id: studySessionId,
            saved_at: new Date().toISOString()
          })
          .select()
          .single()
          
        if (saveError) throw saveError
        
        // Update local state
        setSavedVideos(prev => [savedVideo, ...prev])
        setVideos(prev => 
          prev.map(v => 
            v.id === video.id 
              ? { ...v, bookmarked: true } 
              : v
          )
        )
        
        toast({
          title: "Video Saved",
          description: "The video has been saved to your collection."
        })
      }
    } catch (error) {
      console.error('Error saving/removing video:', error)
      toast({
        title: "Error",
        description: "There was a problem saving/removing the video.",
        variant: "destructive"
      })
    }
  }
  
  // Generate a search query from a note
  const generateSearchFromNote = async (note: NoteType) => {
    setIsSearching(true)
    
    try {
      // Make API call to generate a search query
      const response = await fetch('/api/openai/generate-search-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: note.content,
          prompt: "Based on this study note, generate a concise and specific YouTube search query (max 10 words) that would help find educational videos on this topic. Focus on the main subject and key concepts. Return only the search query with no additional text, quotes, or explanations."
        })
      })
      
      if (!response.ok) throw new Error('Error generating search query')
      
      const data = await response.json()
      const generatedQuery = data.result.trim()
      
      // Update state with the generated query and perform search
      setSearchQuery(generatedQuery)
      setSelectedNote(note)
      
      // Perform the search with the generated query
      await performSearch(generatedQuery)
    } catch (error) {
      console.error('Error generating search from note:', error)
      toast({
        title: "Error Generating Search Query",
        description: "There was a problem creating a search query from your note.",
        variant: "destructive"
      })
    } finally {
      setIsSearching(false)
    }
  }
  
  if (isLoadingAuth || isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }
  
  const displayVideos = showSavedOnly 
    ? savedVideos.map(video => ({
        ...video,
        id: video.video_id,
        title: video.title,
        description: video.description,
        thumbnail: video.thumbnail,
        channel: video.channel,
        publishedAt: video.published_at,
        videoUrl: video.video_url,
        bookmarked: true
      }))
    : videos
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="min-h-screen pt-16 pb-8">
        <div className="max-w-5xl mx-auto p-4">
          <div className="flex flex-col space-y-6">
            {/* Header with back button */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-8 mb-6">
              <div>
                <Link href={`/modules/${moduleId}?title=${encodeURIComponent(moduleData?.details?.title || moduleData?.module_title || 'Untitled Module')}`}>
                  <Button variant="outline" size="sm" className="mb-3">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Module
                  </Button>
                </Link>
                <h1 className="text-3xl font-bold">{moduleData?.details?.title || 'YouTube Videos'}</h1>
                <p className="text-muted-foreground mt-1">Find and save educational videos for your studies</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowSavedOnly(!showSavedOnly)}
                className="self-start md:self-center"
              >
                {showSavedOnly ? (
                  <><Search className="h-4 w-4 mr-2" /> Show Search Results</>
                ) : (
                  <><Bookmark className="h-4 w-4 mr-2" /> Show Saved Videos</>
                )}
              </Button>
            </div>
            
            {/* API Key Missing Alert */}
            {showApiKeyMissing && (
              <Alert variant="destructive" className="mb-6">
                <CircleSlash className="h-4 w-4" />
                <AlertTitle>YouTube API Key Missing</AlertTitle>
                <AlertDescription>
                  The YouTube API key is missing or invalid. Please contact support or add a valid YouTube API key to your environment variables.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Search section */}
            {!showSavedOnly && (
              <Card className="bg-background-card shadow-sm mb-8">
                <CardHeader>
                  <CardTitle className="text-xl">Search for Videos</CardTitle>
                  <CardDescription>
                    Find educational videos related to your notes or any topic
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <Input
                        placeholder="Enter search terms..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSearch();
                          }
                        }}
                        className="border-border"
                      />
                    </div>
                    <Button onClick={handleSearch} disabled={isSearching} className="shrink-0">
                      {isSearching ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching...</>
                      ) : (
                        <><Search className="mr-2 h-4 w-4" /> Search</>
                      )}
                    </Button>
                  </div>
                  
                  {/* Select a note to search from */}
                  {notes.length > 0 && (
                    <div>
                      <p className="text-sm mb-3 font-medium">Search based on your notes:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {notes.slice(0, 6).map(note => (
                          <Card 
                            key={note.id} 
                            className={`cursor-pointer hover:bg-secondary/10 transition-colors p-3 ${selectedNote?.id === note.id ? 'bg-secondary/20 border-primary' : ''}`}
                            onClick={() => generateSearchFromNote(note)}
                          >
                            <p className="font-medium text-sm line-clamp-1">{note.title}</p>
                            {note.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {note.tags.slice(0, 2).map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {note.tags.length > 2 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{note.tags.length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Videos display */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-semibold">
                  {showSavedOnly 
                    ? "Saved Videos" 
                    : selectedNote 
                      ? `Videos related to "${selectedNote.title}"` 
                      : isSearching && videos.length === 0
                        ? "Finding relevant videos..."
                        : searchQuery
                          ? `Videos for "${searchQuery}"`
                          : "Recommended Videos"}
                </h2>
                
                {/* Display count when there are videos */}
                {(showSavedOnly ? savedVideos.length > 0 : videos.length > 0) && (
                  <span className="text-muted-foreground text-sm">
                    {showSavedOnly 
                      ? `${savedVideos.length} saved video${savedVideos.length !== 1 ? 's' : ''}` 
                      : `${videos.length} video${videos.length !== 1 ? 's' : ''}`}
                  </span>
                )}
              </div>
              
              {isSearching && videos.length === 0 ? (
                <div className="text-center py-12 bg-background-card rounded-lg shadow-sm border border-border">
                  <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin mb-4" />
                  <h3 className="text-lg font-medium">Finding videos...</h3>
                  <p className="text-text-light mt-2 max-w-md mx-auto">
                    Searching for the most relevant educational videos for your studies
                  </p>
                </div>
              ) : displayVideos.length === 0 ? (
                <div className="text-center py-12 bg-background-card rounded-lg shadow-sm border border-border">
                  {showSavedOnly ? (
                    <>
                      <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                        <Bookmark className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium">No saved videos yet</h3>
                      <p className="text-text-light mt-2 mb-6 max-w-md mx-auto">
                        Search for videos and bookmark them to save them for later.
                      </p>
                      <Button onClick={() => setShowSavedOnly(false)}>
                        <Search className="mr-2 h-4 w-4" />
                        Search for Videos
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                        <Search className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium">No videos found</h3>
                      <p className="text-text-light mt-2 max-w-md mx-auto">
                        Try searching for different terms or selecting a note to find related videos.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {displayVideos.map(video => (
                    <Card key={video.id} className="bg-background-card overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
                      <div className="relative pb-[56.25%] bg-black">
                        <Image 
                          src={video.thumbnail} 
                          alt={video.title}
                          className="absolute inset-0 object-cover"
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      </div>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base line-clamp-2">{video.title}</CardTitle>
                        <CardDescription className="line-clamp-1 flex items-center gap-1">
                          {video.channel} • {new Date(video.publishedAt).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2 flex-1">
                        <p className="text-sm text-text-light line-clamp-2">
                          {video.description}
                        </p>
                      </CardContent>
                      <CardFooter className="pt-0 flex justify-between">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(video.videoUrl, '_blank')}
                          className="gap-1"
                        >
                          Watch <ExternalLink className="ml-1 h-3 w-3" />
                        </Button>
                        <Button
                          variant={video.bookmarked ? "default" : "secondary"}
                          size="sm"
                          onClick={() => handleSaveVideo(video)}
                          className="gap-1"
                        >
                          {video.bookmarked ? (
                            <>Saved <Bookmark className="ml-1 h-3 w-3 fill-current" /></>
                          ) : (
                            <>Save <Bookmark className="ml-1 h-3 w-3" /></>
                          )}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  )
} 