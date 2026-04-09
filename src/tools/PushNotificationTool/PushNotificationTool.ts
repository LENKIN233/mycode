// Stub: restored shim — original implementation not available
import { buildTool } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { z } from 'zod/v4'

const inputSchema = lazySchema(() =>
  z.strictObject({
    title: z.string().describe('Notification title.'),
    body: z.string().optional().describe('Notification body.'),
  }),
)

export const PushNotificationTool = buildTool({
  name: 'PushNotification',
  async description() {
    return 'Send a push notification to the user.'
  },
  inputSchema,
  userFacingName() {
    return 'Push Notification'
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
      text: 'PushNotification tool is not available in this build.',
    }
  },
})
