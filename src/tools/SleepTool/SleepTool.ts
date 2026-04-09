// Stub: restored shim — original implementation not available
import { buildTool } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { z } from 'zod/v4'

const inputSchema = lazySchema(() =>
  z.strictObject({
    duration_ms: z.number().describe('Duration to sleep in milliseconds.'),
    reason: z.string().optional().describe('Reason for sleeping.'),
  }),
)

export const SleepTool = buildTool({
  name: 'Sleep',
  async description() {
    return 'Sleep for a specified duration.'
  },
  inputSchema: inputSchema(),
  userFacingName() {
    return 'Sleep'
  },
  isReadOnly() {
    return true
  },
  isEnabled() {
    return false
  },
  async call() {
    return {
      type: 'text' as const,
      text: 'Sleep tool is not available in this build.',
    }
  },
})
