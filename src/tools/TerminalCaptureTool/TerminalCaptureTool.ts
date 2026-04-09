// Stub: restored shim — original implementation not available
import { buildTool } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { z } from 'zod/v4'

const inputSchema = lazySchema(() =>
  z.strictObject({
    command: z.string().describe('Terminal capture command.'),
  }),
)

export const TerminalCaptureTool = buildTool({
  name: 'TerminalCapture',
  async description() {
    return 'Capture terminal output.'
  },
  inputSchema,
  userFacingName() {
    return 'Terminal Capture'
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
      text: 'TerminalCapture tool is not available in this build.',
    }
  },
})
