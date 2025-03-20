export interface GradingSystem {
  id: string;
  user_id: string;
  study_session_id: string;
  target_grade: number;
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

export interface GradeEntry {
  id: string;
  grading_component_id: string;
  name: string;
  score: number;
  max_score: number;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface GradingComponentWithEntries extends GradingComponent {
  entries: GradeEntry[];
  currentScore?: number; // Calculated score for this component
}

export interface GradingSystemWithComponents extends GradingSystem {
  components: GradingComponentWithEntries[];
  currentGrade?: number; // Calculated overall grade
  remainingNeeded?: number; // How much more needed to reach target
}

export interface GradeCalculationResult {
  currentGrade: number;
  targetGrade: number;
  remainingNeeded: number;
  isOnTrack: boolean;
  componentScores: {
    componentId: string;
    componentName: string;
    weight: number;
    currentScore: number;
    weightedScore: number;
  }[];
}

export type GradeStatus = 'excellent' | 'good' | 'warning' | 'danger';

export interface NewGradingSystem {
  study_session_id: string;
  target_grade: number;
}

export interface NewGradingComponent {
  grading_system_id: string;
  name: string;
  weight: number;
}

export interface NewGradeEntry {
  grading_component_id: string;
  name: string;
  score: number;
  max_score: number;
  date: string;
} 