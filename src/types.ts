export type AlcoholStatus = 'none' | 'alcohol' | null

export interface DailyEntry {
  date: string
  alcohol: AlcoholStatus
  trained: boolean
  trainingMinutes?: number
  trainingType?: string
  energy?: number
  mood?: number
  sleep?: number
  weightKg?: number
  notes?: string
  updatedAt: string
}
