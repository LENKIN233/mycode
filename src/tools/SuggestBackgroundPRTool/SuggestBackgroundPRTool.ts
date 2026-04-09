// Stub: restored shim — original implementation not available
import { buildTool } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { z } from 'zod/v4'

const inputSchema = lazySchema(() =>
  z.strictObject({
    description: z.string().describe('Description of the background PR.'),
  }),
)

export const SuggestBackgroundPRTool = buildTool({
  name: 'SuggestBackgroundPR',
  async description() {
    return 'Suggest a background PR.'
  },
  inputSchema: inputSchema(),
  userFacingName() {
    return 'Suggest Background PR'
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
      text: 'SuggestBackgroundPR tool is not available in this build.',
    }
  },
})
