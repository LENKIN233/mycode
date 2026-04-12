// Analytics service — telemetry removed, all exports are no-ops.
// Dead stub files (config, datadog, sink, firstPartyEventLogger,
// sinkKillswitch, firstPartyEventLoggingExporter) have been merged
// here to eliminate 6 pointless files.

export type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS = never
export type AnalyticsMetadata_I_VERIFIED_THIS_IS_PII_TAGGED = never

export function stripProtoFields<V>(
  metadata: Record<string, V>,
): Record<string, V> {
  return metadata
}

type LogEventMetadata = { [key: string]: boolean | number | undefined }

export type AnalyticsSink = {
  logEvent: (eventName: string, metadata: LogEventMetadata) => void
  logEventAsync: (
    eventName: string,
    metadata: LogEventMetadata,
  ) => Promise<void>
}

export function attachAnalyticsSink(_sink: AnalyticsSink): void {}

export function logEvent(
  _eventName: string,
  _metadata: LogEventMetadata,
): void {}

export async function logEventAsync(
  _eventName: string,
  _metadata: LogEventMetadata,
): Promise<void> {}

export function _resetForTesting(): void {}

// ── from config.ts ──
export function isAnalyticsDisabled(): boolean {
  return true
}
export function isFeedbackSurveyDisabled(): boolean {
  return true
}

// ── from datadog.ts ──
export const initializeDatadog = async (): Promise<boolean> => false
export async function shutdownDatadog(): Promise<void> {}
export async function trackDatadogEvent(
  _eventName: string,
  _metadata: Record<string, unknown>,
): Promise<void> {}

// ── from sink.ts ──
export function initializeAnalyticsGates(): void {}
export function initializeAnalyticsSink(): void {}

// ── from firstPartyEventLogger.ts ──
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
