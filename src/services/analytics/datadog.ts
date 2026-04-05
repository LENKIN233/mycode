// Telemetry removed — all exports are no-ops

export const initializeDatadog = async (): Promise<boolean> => false
export async function shutdownDatadog(): Promise<void> {}
export async function trackDatadogEvent(
  _eventName: string,
  _metadata: Record<string, unknown>,
): Promise<void> {}
