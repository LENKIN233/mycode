// Buddy companion system — stripped
import type { Companion, CompanionBones } from './types.js'

export type Roll = { bones: CompanionBones; inspirationSeed: number }
export function roll(_userId: string): Roll { return { bones: {} as CompanionBones, inspirationSeed: 0 } }
export function rollWithSeed(_seed: string): Roll { return roll('') }
export function companionUserId(): string { return '' }
export function getCompanion(): Companion | undefined { return undefined }
