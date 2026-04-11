// Stub — computer use wrapper removed (requires Anthropic infrastructure)
type ComputerUseSessionContext = Record<string, unknown>
type ComputerUseMCPToolOverrides = Record<string, unknown>
export function buildSessionContext(): ComputerUseSessionContext { return {} }
export function getComputerUseMCPToolOverrides(_toolName: string): ComputerUseMCPToolOverrides { return {} }
