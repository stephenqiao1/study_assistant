import { 
  GradeEntry, 
  GradingComponentWithEntries,
  GradingSystemWithComponents,
  GradeCalculationResult,
  GradeStatus
} from '@/types/grading';

type _GradingComponent = {
  id: string;
  name: string;
  weight: number;
};

type _ComponentScore = {
  id: string;
  name: string;
  weight: number;
  score: number;
};

/**
 * Calculate the current score for a single grading component
 * @param component The grading component
 * @param entries The grade entries for this component
 * @returns The current score as a percentage (0-100)
 */
export function calculateComponentScore(
  component: GradingComponentWithEntries,
  entries: GradeEntry[]
): number {
  if (entries.length === 0) return 0;
  
  const totalPoints = entries.reduce((sum, entry) => sum + entry.score, 0);
  const totalMaxPoints = entries.reduce((sum, entry) => sum + entry.max_score, 0);
  
  if (totalMaxPoints === 0) return 0;
  return (totalPoints / totalMaxPoints) * 100;
}

/**
 * Calculate the weighted grade for a component
 * @param componentScore The component score (0-100)
 * @param weight The weight of the component (0-100)
 * @returns The weighted score contribution to the overall grade
 */
export function calculateWeightedScore(componentScore: number, weight: number): number {
  return (componentScore * weight) / 100;
}

/**
 * Calculate the overall grade based on all components and their entries
 * @param gradingSystem The grading system with components and entries
 * @returns Detailed calculation results
 */
export function calculateOverallGrade(
  gradingSystem: GradingSystemWithComponents
): GradeCalculationResult {
  const componentScores = gradingSystem.components.map(component => {
    const score = calculateComponentScore(component, component.entries);
    const weightedScore = calculateWeightedScore(score, component.weight);
    
    return {
      componentId: component.id,
      componentName: component.name,
      weight: component.weight,
      currentScore: score,
      weightedScore
    };
  });
  
  const currentGrade = componentScores.reduce(
    (sum, component) => sum + component.weightedScore, 
    0
  );
  
  const remainingNeeded = Math.max(0, gradingSystem.target_grade - currentGrade);
  
  return {
    currentGrade,
    targetGrade: gradingSystem.target_grade,
    remainingNeeded,
    isOnTrack: currentGrade >= gradingSystem.target_grade,
    componentScores
  };
}

/**
 * Determine the status of a grade based on how close it is to the target
 * @param currentGrade The current grade
 * @param targetGrade The target grade
 * @returns A status indicator
 */
export function getGradeStatus(currentGrade: number, targetGrade: number): GradeStatus {
  const difference = currentGrade - targetGrade;
  
  if (difference >= 5) return 'excellent';
  if (difference >= 0) return 'good';
  if (difference >= -10) return 'warning';
  return 'danger';
}

/**
 * Format a grade as a string with specified decimal places
 * @param grade The grade to format
 * @param decimalPlaces Number of decimal places to show
 * @returns Formatted grade string
 */
export function formatGrade(grade: number, decimalPlaces: number = 1): string {
  return grade.toFixed(decimalPlaces);
}

/**
 * Calculate what grade is needed on remaining assignments to reach the target
 * @param currentGrade Current overall grade
 * @param targetGrade Target grade
 * @param remainingWeight Total weight of remaining assignments
 * @returns The needed grade on remaining assignments
 */
export function calculateNeededGrade(
  currentGrade: number, 
  targetGrade: number, 
  remainingWeight: number
): number {
  if (remainingWeight <= 0) return 0;
  
  const currentPoints = currentGrade * (100 - remainingWeight) / 100;
  const neededPoints = targetGrade - currentPoints;
  
  return (neededPoints * 100) / remainingWeight;
}

/**
 * Calculate the total weight of components that have entries
 * @param components The grading components with entries
 * @returns The total weight of components with entries
 */
export function calculateCompletedWeight(
  components: GradingComponentWithEntries[]
): number {
  return components
    .filter(component => component.entries.length > 0)
    .reduce((sum, component) => sum + component.weight, 0);
}

/**
 * Calculate the remaining weight available for new components
 * @param components The grading components
 * @returns The remaining weight available (100% - total weight of all components)
 */
export function calculateRemainingWeight(
  components: GradingComponentWithEntries[]
): number {
  const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);
  return Math.max(0, 100 - totalWeight);
}

export function calculateTotalScore(
  gradingSystem: GradingSystemWithComponents
): GradeCalculationResult {
  const componentScores = gradingSystem.components.map(component => {
    const currentScore = calculateComponentScore(component, component.entries);
    const weightedScore = calculateWeightedScore(currentScore, component.weight);
    return {
      componentId: component.id,
      componentName: component.name,
      weight: component.weight,
      currentScore,
      weightedScore
    };
  });

  const currentGrade = componentScores.reduce((sum, score) => sum + score.weightedScore, 0);

  return {
    currentGrade,
    targetGrade: gradingSystem.target_grade,
    remainingNeeded: Math.max(0, gradingSystem.target_grade - currentGrade),
    isOnTrack: currentGrade >= gradingSystem.target_grade,
    componentScores
  };
} 