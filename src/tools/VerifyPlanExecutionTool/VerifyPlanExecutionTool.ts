// Stub: restored shim — original implementation not available
import { buildTool } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { z } from 'zod/v4'

const inputSchema = lazySchema(() =>
  z.strictObject({
    plan: z.string().describe('The plan to verify.'),
  }),
)

export const VerifyPlanExecutionTool = buildTool({
  name: 'VerifyPlanExecution',
  async description() {
    return 'Verify plan execution progress.'
  },
  inputSchema: inputSchema(),
  userFacingName() {
    return 'Verify Plan Execution'
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
      text: 'VerifyPlanExecution tool is not available in this build.',
    }
  },
})
