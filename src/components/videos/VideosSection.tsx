import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { X, Sparkles, Loader2, Search, CircleSlash, Bookmark, ExternalLink } from 'lucide-react'
import Image from 'next/image'

type ActiveSection = 'notes' | 'flashcards' | 'teachback' | 'formulas' | 'videos' | 'practice' | 'noteFlashcards' | 'reminders'

interface NoteType {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  url: string;
  channelTitle?: string;
  channel?: string;
  publishedAt?: string;
  published_at?: string;
  duration?: string;
  viewCount?: number;
  saved?: boolean;
  bookmarked?: boolean;
  videoUrl?: string;
  video_url?: string;
  video_id?: string;
}

interface VideosSectionProps {
  videos: Video[];
  savedVideos: Video[];
  selectedNote: NoteType | null;
  isSearchingVideos: boolean;
  videoSearchQuery: string;
  setVideoSearchQuery: (query: string) => void;
  setActiveSection: (section: ActiveSection) => void;
  handleSearchVideos: () => void;
  generateSearchFromNote: (note: NoteType) => void;
  handleSaveVideo: (video: Partial<Video> & { id: string; title: string }) => void;
}

export function VideosSection({
  videos,
  savedVideos,
  selectedNote,
  isSearchingVideos,
  videoSearchQuery,
  setVideoSearchQuery,
  setActiveSection,
  handleSearchVideos,
  generateSearchFromNote,
  handleSaveVideo
}: VideosSectionProps) {
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Educational Videos</h1>
        </div>
        <div className="flex space-x-2">
          {selectedNote && (
            <Button 
              onClick={() => generateSearchFromNote(selectedNote)}
              disabled={isSearchingVideos}
              variant="outline"
            >
              <Sparkles className="h-4 w-4 mr-1" /> Find Videos for This Note
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={() => setActiveSection('notes')}
          >
            <X className="h-4 w-4 mr-1" /> Close
          </Button>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="flex space-x-2">
          <Input
            placeholder="Search for educational videos..."
            value={videoSearchQuery}
            onChange={(e) => setVideoSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearchVideos();
              }
            }}
            className="flex-1"
          />
          <Button onClick={handleSearchVideos} disabled={isSearchingVideos}>
            {isSearchingVideos ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span className="ml-2">Search</span>
          </Button>
        </div>
      </div>
      
      {/* Search Results Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Search Results</h2>
        {isSearchingVideos ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Searching for educational videos...</p>
            <p className="text-sm text-muted-foreground">Finding the most relevant content for your studies</p>
          </div>
        ) : videos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos.map((video) => (
              <Card key={video.id} className="overflow-hidden">
                <div className="aspect-video relative">
                  <Image 
                    src={video.thumbnail} 
                    alt={video.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    priority={false}
                  />
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between">
                    <h3 className="font-bold line-clamp-2">{video.title}</h3>
                    <div className="flex">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleSaveVideo(video)}
                      >
                        <Bookmark 
                          className={`h-4 w-4 ${video.bookmarked ? 'fill-current' : ''}`}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        asChild
                      >
                        <a href={video.videoUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {video.description}
                  </p>
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {video.channelTitle}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {video.publishedAt ? new Date(video.publishedAt).toLocaleDateString() : 'Unknown date'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : videoSearchQuery ? (
          <div className="flex flex-col items-center justify-center py-10">
            <CircleSlash className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No videos found</p>
            <p className="text-sm text-muted-foreground">Try searching for different terms</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10">
            <Search className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Search for educational videos</p>
            <p className="text-sm text-muted-foreground">Find videos related to your study materials</p>
          </div>
        )}
      </div>
      
      {/* Saved Videos Section */}
      <div className="border-t pt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Saved Videos</h2>
          <span className="text-sm text-muted-foreground">
            {savedVideos.length} {savedVideos.length === 1 ? 'video' : 'videos'} saved
          </span>
        </div>
        {savedVideos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedVideos.map((video) => (
              <Card key={video.id} className="overflow-hidden">
                <div className="aspect-video relative">
                  <Image 
                    src={video.thumbnail} 
                    alt={video.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    priority={false}
                  />
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between">
                    <h3 className="font-bold line-clamp-2">{video.title}</h3>
                    <div className="flex">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleSaveVideo({
                          id: video.video_id || video.id || '',
                          title: video.title,
                          bookmarked: true
                        })}
                      >
                        <Bookmark className="h-4 w-4 fill-current" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        asChild
                      >
                        <a href={video.video_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {video.description}
                  </p>
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {video.channelTitle}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {video.published_at ? new Date(video.published_at).toLocaleDateString() : 'Unknown date'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 bg-muted/50 rounded-lg">
            <Bookmark className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No saved videos yet</p>
            <p className="text-sm text-muted-foreground">Save videos while searching to access them here</p>
          </div>
        )}
      </div>
    </div>
  )
} 