// Buddy companion system — stripped (decorative feature removed)
// Types kept for config.ts / AppStateStore.ts compatibility

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const
export type Rarity = (typeof RARITIES)[number]
export type Species = string
export type Eye = string
export type Hat = string
export type StatName = string

export type CompanionBones = {
  rarity: Rarity
  species: Species
  eye: Eye
  hat: Hat
  shiny: boolean
  stats: Record<string, number>
}
export type CompanionSoul = { name: string; personality: string }
export type Companion = CompanionBones & CompanionSoul & { hatchedAt: number }
export type StoredCompanion = CompanionSoul & { hatchedAt: number }

export const RARITY_COLORS: Record<Rarity, string> = {
  common: 'inactive',
  uncommon: 'success',
  rare: 'permission',
  epic: 'autoAccept',
  legendary: 'warning',
}

// Re-exports kept for any remaining internal references
export const SPECIES: readonly string[] = []
export const EYES: readonly string[] = []
export const HATS: readonly string[] = []
export const STAT_NAMES: readonly string[] = []
export const RARITY_WEIGHTS: Record<Rarity, number> = { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 }
export const RARITY_STARS: Record<Rarity, string> = { common: '★', uncommon: '★★', rare: '★★★', epic: '★★★★', legendary: '★★★★★' }
