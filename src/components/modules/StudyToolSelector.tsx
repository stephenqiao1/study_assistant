'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Brain, ScrollText } from 'lucide-react'

interface StudyToolSelectorProps {
  moduleId: string
}

const toolConfig = {
  teachBack: {
    label: 'Teach Back',
    icon: Brain,
    description: 'Explain concepts in your own words',
    color: 'text-blue-500'
  },
  flashcards: {
    label: 'Flashcards',
    icon: ScrollText,
    description: 'Review key concepts with flashcards',
    color: 'text-green-500'
  }
}

export default function StudyToolSelector({ moduleId }: StudyToolSelectorProps) {
  const router = useRouter()

  const handleSelectTool = (tool: string) => {
    if (tool.toLowerCase() === 'teachback') {
      router.push(`/modules/${moduleId}/teach`)
    } else {
      router.push(`/modules/${moduleId}/${tool.toLowerCase()}`)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(toolConfig).map(([tool, config]) => (
        <Card
          key={tool}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleSelectTool(tool)}
        >
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-lg bg-gray-100 ${config.color}`}>
                <config.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-text mb-1">{config.label}</h3>
                <p className="text-text-light text-sm">{config.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 