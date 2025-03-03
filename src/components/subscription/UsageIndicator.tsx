import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

interface UsageIndicatorProps {
  current: number
  limit: number
  isLimited: boolean
  type: 'teach_back'
  className?: string
}

export function UsageIndicator({
  current,
  limit,
  isLimited,
  type,
  className = ''
}: UsageIndicatorProps) {
  const percentage = limit === -1 ? 0 : Math.min((current / limit) * 100, 100)
  const isUnlimited = limit === -1
  const isNearLimit = !isUnlimited && percentage >= 80

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-light dark:text-gray-300">
          {type === 'teach_back' ? 'Teach-Back Sessions' : 'Chat Messages'}
        </span>
        <span className="font-medium">
          {isUnlimited ? (
            '∞ Unlimited'
          ) : (
            `${current} / ${limit}`
          )}
        </span>
      </div>

      {!isUnlimited && (
        <Progress 
          value={percentage} 
          className={`h-2 ${isLimited ? 'bg-red-100' : isNearLimit ? 'bg-yellow-100' : 'bg-gray-100'}`}
          indicatorClassName={
            isLimited ? 'bg-red-500' : 
            isNearLimit ? 'bg-yellow-500' : 
            'bg-blue-500'
          }
        />
      )}

      {(isLimited || isNearLimit) && !isUnlimited && (
        <div className={`flex items-start gap-2 p-2 rounded text-sm ${
          isLimited ? 'bg-red-50 text-red-800' : 'bg-yellow-50 text-yellow-800'
        }`}>
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            {isLimited ? (
              <>
                <p>You've reached your monthly limit.</p>
                <Link href="/pricing" className="block mt-2">
                  <Button
                    size="sm"
                    variant={isLimited ? "destructive" : "default"}
                    className="w-full"
                  >
                    Upgrade to Continue
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <p>You're approaching your monthly limit.</p>
                <Link href="/pricing" className="block mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    View Plans
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 