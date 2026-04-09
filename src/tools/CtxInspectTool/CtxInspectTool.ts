// Stub: restored shim — original implementation not available
import { buildTool } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { z } from 'zod/v4'

const inputSchema = lazySchema(() =>
  z.strictObject({
    query: z.string().optional().describe('Context inspect query.'),
  }),
)

export const CtxInspectTool = buildTool({
  name: 'CtxInspect',
  async description() {
    return 'Inspect current context.'
  },
  inputSchema: inputSchema(),
  userFacingName() {
    return 'Context Inspect'
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
      text: 'CtxInspect tool is not available in this build.',
    }
  },
})
