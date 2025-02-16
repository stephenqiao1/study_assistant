'use client'

import { FC, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AudioRecorderProps {
  onTranscriptionComplete: (text: string) => void
  prompt?: string // Optional prompt to improve transcription accuracy
  language?: string // Optional language code
  enableTimestamps?: boolean // Optional flag to enable word-level timestamps
}

const AudioRecorder: FC<AudioRecorderProps> = ({ 
  onTranscriptionComplete,
  prompt = '',
  language = 'en',
  enableTimestamps = false
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      setError(null)
      setIsPreparing(true)
      setCountdown(3)

      // Request microphone access during preparation
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      })
      chunksRef.current = []

      // Start countdown
      let count = 3
      const countdownInterval = setInterval(() => {
        count -= 1
        setCountdown(count)
        if (count === 0) {
          clearInterval(countdownInterval)
          setIsPreparing(false)
          // Actually start recording after countdown
          startActualRecording()
        }
      }, 1000)

    } catch (err) {
      console.error('Error accessing microphone:', err)
      setError('Could not access microphone. Please ensure you have granted permission.')
      setIsPreparing(false)
    }
  }

  const startActualRecording = () => {
    if (!mediaRecorderRef.current) return

    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data)
      }
    }

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
      
      if (audioBlob.size > 25 * 1024 * 1024) {
        setError('Audio file is too large. Please record a shorter segment (max 25MB).')
        return
      }

      setIsTranscribing(true)
      setError(null)
      
      try {
        const formData = new FormData()
        formData.append('audio', audioBlob, 'recording.webm')
        if (prompt) formData.append('prompt', prompt)
        if (language) formData.append('language', language)
        if (enableTimestamps) formData.append('timestamp', 'true')

        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Transcription failed')
        }

        const data = await response.json()
        onTranscriptionComplete(data.text)
      } catch (error) {
        console.error('Error transcribing audio:', error)
        setError(error instanceof Error ? error.message : 'Failed to transcribe audio')
        onTranscriptionComplete('Error transcribing audio. Please try again or type your explanation.')
      } finally {
        setIsTranscribing(false)
      }
    }

    mediaRecorderRef.current.start()
    setIsRecording(true)
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        {!isRecording && !isPreparing ? (
          <Button 
            onClick={startRecording}
            disabled={isTranscribing}
          >
            🎤 Start Recording
          </Button>
        ) : isPreparing ? (
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold text-blue-500 animate-pulse">
              {countdown}
            </div>
            <span className="text-sm text-gray-500">
              Get ready to speak...
            </span>
          </div>
        ) : (
          <Button 
            variant="destructive" 
            onClick={stopRecording}
            disabled={isTranscribing}
          >
            ⏹️ Stop Recording
          </Button>
        )}
        {isTranscribing && (
          <span className="text-sm text-gray-500 animate-pulse">
            Transcribing...
          </span>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default AudioRecorder 