// Stub: restored shim — original implementation not available
import { buildTool } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { z } from 'zod/v4'

const inputSchema = lazySchema(() =>
  z.strictObject({
    url: z.string().describe('URL to browse.'),
  }),
)

export const WebBrowserTool = buildTool({
  name: 'WebBrowser',
  async description() {
    return 'Browse a web page.'
  },
  inputSchema,
  userFacingName() {
    return 'Web Browser'
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
      text: 'WebBrowser tool is not available in this build.',
    }
  },
})
