type RecallRating = 'easy' | 'good' | 'hard' | 'forgot'

interface SpacedRepetitionParams {
  ease_factor: number
  review_interval: number
  repetitions: number
  last_recall_rating: RecallRating | null
}

// Convert recall rating to numeric quality (0-5)
function getQualityFromRating(rating: RecallRating): number {
  switch (rating) {
    case 'easy': return 5
    case 'good': return 4
    case 'hard': return 3
    case 'forgot': return 0
    default: return 0
  }
}

// Calculate next interval using SM-2 algorithm
export function calculateNextReview(params: SpacedRepetitionParams): {
  review_interval: number
  ease_factor: number
  repetitions: number
} {
  const { ease_factor, review_interval, repetitions, last_recall_rating } = params
  
  if (!last_recall_rating || last_recall_rating === 'forgot') {
    // Reset on failure
    return {
      review_interval: 1,
      ease_factor: Math.max(1.3, ease_factor - 0.2),
      repetitions: 0
    }
  }

  const quality = getQualityFromRating(last_recall_rating)
  const newEaseFactor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

  let newInterval
  if (repetitions === 0) {
    newInterval = 1
  } else if (repetitions === 1) {
    newInterval = 6
  } else {
    newInterval = Math.round(review_interval * ease_factor)
  }

  return {
    review_interval: newInterval,
    ease_factor: Math.max(1.3, newEaseFactor),
    repetitions: repetitions + 1
  }
}

// Get the next review date based on the interval
export function getNextReviewDate(review_interval: number): string {
  const nextDate = new Date()
  nextDate.setDate(nextDate.getDate() + review_interval)
  return nextDate.toISOString()
}

// Initialize spaced repetition parameters for new cards
export function initializeSpacedRepetition(): SpacedRepetitionParams {
  return {
    ease_factor: 2.5,
    review_interval: 0,
    repetitions: 0,
    last_recall_rating: null
  }
} 