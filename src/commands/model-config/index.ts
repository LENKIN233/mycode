import type { Command } from '../../commands.js'

const modelConfig = {
  type: 'local-jsx',
  name: 'model-config',
  description: 'Configure models for auxiliary tasks (titles, summaries, etc.)',
  immediate: true,
  load: () => import('./model-config.js'),
} satisfies Command

export default modelConfig
