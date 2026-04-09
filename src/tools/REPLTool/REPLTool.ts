// Stub: restored shim — original implementation not available
import { buildTool } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { z } from 'zod/v4'

const inputSchema = lazySchema(() =>
  z.strictObject({
    command: z.string().describe('The command to run in the REPL.'),
  }),
)

export const REPLTool = buildTool({
  name: 'REPL',
  async description() {
    return 'Run code in an interactive REPL session.'
  },
  inputSchema: inputSchema(),
  userFacingName() {
    return 'REPL'
  },
  isReadOnly() {
    return false
  },
  isEnabled() {
    return false
  },
  async call() {
    return {
      type: 'text' as const,
      text: 'REPL tool is not available in this build.',
    }
  },
})
