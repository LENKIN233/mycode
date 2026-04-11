// Stub — voice recording service removed (requires native audio-capture module + Anthropic voice infrastructure)
export function _resetArecordProbeForTesting(): void {}
export function _resetAlsaCardsForTesting(): void {}
export type RecordingAvailability = { available: boolean; reason?: string }
export async function checkVoiceDependencies(): Promise<{ available: boolean; reason?: string }> { return { available: false, reason: 'voice disabled' } }
export async function requestMicrophonePermission(): Promise<boolean> { return false }
export async function checkRecordingAvailability(): Promise<RecordingAvailability> { return { available: false, reason: 'voice disabled' } }
export async function startRecording(_opts?: any): Promise<void> {}
export function stopRecording(): void {}
