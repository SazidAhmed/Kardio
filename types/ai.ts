export interface AiPlannerProfile {
  age: number | null
  sex: string
  heightCm: number | null
  weightKg: number | null
  goal: string
  experience: string
  equipment: string
  injuries: string
  daysPerWeek: number | null
}

export interface AiPlannerImage {
  mimeType: string
  data: string
}

export interface AiPlannerRequest {
  profile: AiPlannerProfile
  images: AiPlannerImage[]
  context?: {
    cardioHistory: Array<{
      name: string
      duration: string
      status: string
      date: string
    }>
    liftHistory: Array<{
      planName: string
      totalVolume: number
      duration: string
      status: string
      date: string
    }>
  }
}

export interface AiAnalysis {
  summary: string
  confidence: 'low' | 'medium' | 'high'
  flags: string[]
  focusAreas: string[]
  disclaimer: string
}

export interface AiCardioExercise {
  name: string
  duration: number
  sets: number
  color?: string
}

export interface AiCardioPlan {
  name: string
  icon: string
  description: string
  warmupDuration: number
  cooldownDuration: number
  restBetweenSets: number
  restBetweenExercises: number
  exercises: AiCardioExercise[]
}

export interface AiLiftSet {
  reps: number
  weight: number
}

export interface AiLiftExercise {
  name: string
  sets: AiLiftSet[]
}

export interface AiLiftPlan {
  name: string
  icon: string
  description: string
  restBetweenSets: number
  exercises: AiLiftExercise[]
}

export interface AiPlannerResponse {
  analysis: AiAnalysis
  cardioPlan: AiCardioPlan
  liftPlan: AiLiftPlan
}
