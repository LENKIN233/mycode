// Stub — voice keyterms removed (requires Anthropic voice_stream endpoint)
export const GLOBAL_KEYTERMS: readonly string[] = []
export function splitIdentifier(name: string): string[] { return name.split(/[-_./\s]+/).filter(w => w.length > 2) }
export async function getVoiceKeyterms(_recentFiles?: ReadonlySet<string>): Promise<string[]> { return [] }
