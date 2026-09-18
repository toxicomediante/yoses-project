export type AlcoholStatus = 'none' | 'alcohol' | null
export type AlcoholCategory = 'beer' | 'wine' | 'spirits'

export interface DailyEntry {
  date: string
  alcohol: AlcoholStatus
  alcoholCategories?: AlcoholCategory[]
  alcoholAmounts?: Partial<Record<AlcoholCategory, number>>
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
