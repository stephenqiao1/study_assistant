'use client'

import { FC } from 'react'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  encouragement?: string
}

const ChatMessage: FC<ChatMessageProps> = ({ role, content, encouragement }) => {
  const isUser = role === 'user'

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex flex-col max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        {!isUser && (
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 ml-2">
            Virtual Student
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-2 ${
            isUser
              ? 'bg-blue-500 text-white rounded-br-sm'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'
          }`}
        >
          <div 
            className="prose dark:prose-invert max-w-none text-sm md:text-base" 
            dangerouslySetInnerHTML={{ __html: content }} 
          />
        </div>
        {encouragement && !isUser && (
          <div className="text-xs italic text-gray-500 dark:text-gray-400 mt-1 ml-2">
            {encouragement}
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatMessage 