'use client'

import { FC, useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import ChatMessage from './ChatMessage'

interface Message {
  role: 'user' | 'assistant'
  content: string
  encouragement?: string
}

interface ChatInterfaceProps {
  initialMessage: string
  originalContent: string
  onSaveConversation: (conversation: any) => void
  savedConversation?: any[]
}

const ChatInterface: FC<ChatInterfaceProps> = ({
  initialMessage,
  originalContent,
  onSaveConversation,
  savedConversation = []
}) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'user', content: initialMessage }
  ])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const hasInitialResponseRef = useRef(false)

  useEffect(() => {
    // Get initial response from virtual student
    if (!hasInitialResponseRef.current) {
      hasInitialResponseRef.current = true
      handleVirtualStudentResponse()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Scroll to bottom when messages change
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleVirtualStudentResponse = async () => {
    if (isLoading) {
      return
    }
    
    setIsLoading(true)
    
    try {
      // Debug logging
      console.log('Sending request to chat API:', {
        hasOriginalContent: !!originalContent,
        contentLength: originalContent?.length || 0,
        messagesCount: messages.length
      })

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          originalContent
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      
      if (data.questions?.length > 0) {
        // Add messages sequentially with a delay between them
        for (const [index, question] of data.questions.entries()) {
          // Create new message
          const newMessage: Message = {
            role: 'assistant',
            content: question,
            // Only add encouragement to the last message
            encouragement: index === data.questions.length - 1 ? data.encouragement : undefined
          }
          
          // Add delay between messages if there are multiple
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
          
          // Update messages state
          setMessages(prev => {
            const newMessages = [...prev, newMessage]
            // Save conversation after state update
            onSaveConversation(newMessages)
            return newMessages
          })
        }
      }

    } catch (error) {
      console.error('Error getting virtual student response:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!currentMessage.trim()) return

    // Create new message with proper typing
    const newMessage: Message = {
      role: 'user',
      content: currentMessage
    }

    // Update messages
    setMessages(prev => [...prev, newMessage])
    setCurrentMessage('')

    // Get virtual student response
    await handleVirtualStudentResponse()
  }

  return (
    <div className="flex flex-col h-[600px] border rounded-lg bg-white dark:bg-gray-900 shadow-lg">
      {/* Chat Header */}
      <div className="border-b p-4 bg-gray-50 dark:bg-gray-800 rounded-t-lg">
        <div className="flex items-center justify-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          <span className="text-sm font-medium">Virtual Student is online</span>
        </div>
      </div>

      {/* Chat Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.05' fill-rule='evenodd'%3E%3Cpath d='M5 0h1L0 6V5zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E")`
        }}
      >
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            role={message.role}
            content={message.content}
            encouragement={message.encouragement}
          />
        ))}
        {isLoading && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4 bg-white dark:bg-gray-800 rounded-b-lg">
        <div className="relative flex items-end gap-2">
          <textarea
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="Type your message..."
            className="flex-1 resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
            rows={3}
          />
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !currentMessage.trim()}
            className="rounded-full w-10 h-10 p-0 flex items-center justify-center shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ChatInterface 