import type { Command } from '../../commands.js'

const modelConfig = {
  type: 'local-jsx',
  name: 'model-config',
  description: 'Configure provider and model routes for request categories',
  immediate: true,
  load: () => import('./model-config.js'),
} satisfies Command

export default modelConfig
