// Stub — computer use gates removed (requires Anthropic infrastructure)
type CoordinateMode = 'absolute' | 'relative'
type CuSubGates = Record<string, boolean>
export function getChicagoEnabled(): boolean { return false }
export function getChicagoSubGates(): CuSubGates { return {} }
export function getChicagoCoordinateMode(): CoordinateMode { return 'absolute' }
