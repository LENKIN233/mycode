// Stub: restored shim — original implementation not available
import { buildTool } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { z } from 'zod/v4'

const inputSchema = lazySchema(() =>
  z.strictObject({
    pr_url: z.string().describe('URL of the PR to subscribe to.'),
  }),
)

export const SubscribePRTool = buildTool({
  name: 'SubscribePR',
  async description() {
    return 'Subscribe to a pull request for updates.'
  },
  inputSchema,
  userFacingName() {
    return 'Subscribe PR'
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
      text: 'SubscribePR tool is not available in this build.',
    }
  },
})
