export type AlcoholStatus = 'none' | 'alcohol' | null
export type AlcoholCategory = 'beer' | 'wine' | 'spirits'

export interface TrainingSet {
  reps?: number
}

// exerciseId keeps exercise history stable across display-name changes; RIR is stored per exercise/session.
export interface TrainingExercise {
  exerciseId?: string
  muscleGroup: string
  name: string
  loadKg?: number
  rir?: number
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
