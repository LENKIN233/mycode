import type { Command } from '../../commands.js'

export default {
  type: 'local',
  name: 'usage',
  description: 'Show usage and request counts of the current session',
  supportsNonInteractive: true,
  load: () => import('./summary.js'),
} satisfies Command
