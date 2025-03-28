export interface GradeEntry {
  id: string;
  component_id: string;
  name: string;
  score: number;
  max_score: number;
  weight?: number;
  created_at: string;
  updated_at: string;
}

export interface GradingComponent {
  id: string;
  grading_system_id: string;
  name: string;
  weight: number;
  created_at: string;
  updated_at: string;
}

export interface GradingComponentWithEntries extends GradingComponent {
  entries: GradeEntry[];
  currentScore?: number;
  updated_at: string;
}

export interface GradingSystemWithComponents {
  id: string;
  name: string;
  target_grade: number;
  components: GradingComponentWithEntries[];
}

export interface ComponentScore {
  componentId: string;
  componentName: string;
  weight: number;
  currentScore: number;
  weightedScore: number;
}

export interface GradeCalculationResult {
  currentGrade: number;
  targetGrade: number;
  remainingNeeded: number;
  isOnTrack: boolean;
  componentScores: ComponentScore[];
}

export type GradeStatus = 'excellent' | 'good' | 'warning' | 'danger'; 