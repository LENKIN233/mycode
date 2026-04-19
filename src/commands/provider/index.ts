import type { Command } from '../../commands.js'
import { getAPIProvider } from '../../utils/model/providers.js'

const PROVIDER_LABELS: Record<string, string> = {
  firstParty: 'Manual API / Compatible Endpoint',
  bedrock: 'AWS Bedrock',
  vertex: 'Google Vertex',
  foundry: 'Azure Foundry',
  copilot: 'GitHub Copilot',
}

export default {
  type: 'local-jsx',
  name: 'provider',
  get description() {
    const current = PROVIDER_LABELS[getAPIProvider()] ?? getAPIProvider()
    return `Switch API provider (currently ${current})`
  },
  argumentHint: '[copilot|api]',
  immediate: true,
  load: () => import('./provider.js'),
} satisfies Command
