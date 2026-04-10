import { useEffect } from 'react'
import { saveCurrentSessionUsage } from './usage-tracker.js'
import type { FpsMetrics } from './utils/fpsTracker.js'

export function useSessionUsagePersistence(
  getFpsMetrics?: () => FpsMetrics | undefined,
): void {
  useEffect(() => {
    const f = () => {
      saveCurrentSessionUsage(getFpsMetrics?.())
    }
    process.on('exit', f)
    return () => {
      process.off('exit', f)
    }
  }, [])
}
