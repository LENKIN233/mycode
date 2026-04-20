import type { Command } from '../../commands.js'

const design = {
  type: 'local-jsx',
  name: 'design',
  description: 'Create and iterate an HTML design artifact in artifacts/claude-design',
  argumentHint: '[design brief]',
  immediate: true,
  load: () => import('./design.js'),
} satisfies Command

export default design
