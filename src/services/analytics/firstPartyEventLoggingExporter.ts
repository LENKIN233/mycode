// Telemetry removed — stub exporter

export class FirstPartyEventLoggingExporter {
  export(): void {}
  async shutdown(): Promise<void> {}
  async forceFlush(): Promise<void> {}
}
