// Stub: restored shim — original implementation not available
import { buildTool } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { z } from 'zod/v4'

const inputSchema = lazySchema(() =>
  z.strictObject({
    range: z.string().optional().describe('History range to snip.'),
  }),
)

export const SnipTool = buildTool({
  name: 'Snip',
  async description() {
    return 'Snip conversation history.'
  },
  inputSchema,
  userFacingName() {
    return 'Snip'
  },
  isReadOnly() {
    return true
  },
  async isEnabled() {
    return false
  },
  async call() {
    return {
      type: 'text' as const,
      text: 'Snip tool is not available in this build.',
    }
  },
})
