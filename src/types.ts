export type AlcoholStatus = 'none' | 'alcohol' | null
export type AlcoholCategory = 'beer' | 'wine' | 'spirits'

export interface TrainingSet {
  reps: number
}

export interface TrainingExercise {
  muscleGroup: string
  name: string
  loadKg?: number
  sets: TrainingSet[]
}

export interface DailyEntry {
  date: string
  alcohol: AlcoholStatus
  alcoholCategories?: AlcoholCategory[]
  alcoholAmounts?: Partial<Record<AlcoholCategory, number>>
  alcoholNotes?: string
  trained: boolean
  trainingMinutes?: number
  trainingType?: string
  exercises?: TrainingExercise[]
  energy?: number
  mood?: number
  sleep?: number
  weightKg?: number
  notes?: string
  updatedAt: string
}
