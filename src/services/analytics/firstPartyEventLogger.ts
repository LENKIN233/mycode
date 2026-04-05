// Telemetry removed — all exports are no-ops

export type EventSamplingConfig = {
  defaultSampleRate: number
  eventOverrides: Record<string, number>
}

export function getEventSamplingConfig(): EventSamplingConfig {
  return { defaultSampleRate: 1, eventOverrides: {} }
}

export function shouldSampleEvent(_eventName: string): number | null {
  return null
}

export function is1PEventLoggingEnabled(): boolean {
  return false
}

export async function shutdown1PEventLogging(): Promise<void> {}

export function logEventTo1P(
  _eventName: string,
  _metadata: Record<string, unknown>,
): void {}

export type GrowthBookExperimentData = {
  experimentId: string
  variationId: number
}

export function logGrowthBookExperimentTo1P(
  _data: GrowthBookExperimentData,
): void {}

export function initialize1PEventLogging(): void {}

export async function reinitialize1PEventLoggingIfConfigChanged(): Promise<void> {}
