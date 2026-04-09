// Stub: restored shim — original implementation not available
import { buildTool } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { z } from 'zod/v4'

const inputSchema = lazySchema(() =>
  z.strictObject({
    file_path: z.string().describe('Path to the file to send.'),
  }),
)

export const SendUserFileTool = buildTool({
  name: 'SendUserFile',
  async description() {
    return 'Send a file to the user.'
  },
  inputSchema: inputSchema(),
  userFacingName() {
    return 'Send User File'
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
      text: 'SendUserFile tool is not available in this build.',
    }
  },
})
