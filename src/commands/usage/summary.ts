import { formatUsageSummary } from '../../usage-tracker.js'
import type { LocalCommandCall } from '../../types/command.js'

export const call: LocalCommandCall = async () => {
  const value = formatUsageSummary()

  return { type: 'text', value }
}
