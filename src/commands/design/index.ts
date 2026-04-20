import type { Command } from '../../commands.js'

const design = {
  type: 'local-jsx',
  name: 'design',
  description:
    'Create, browse, and iterate HTML design artifacts in artifacts/claude-design',
  argumentHint:
    '[brief] [--template canvas|prototype|deck] [--file path|--latest|--list]',
  immediate: true,
  load: () => import('./design.js'),
} satisfies Command

export default design
