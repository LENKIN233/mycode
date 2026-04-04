import chalk from 'chalk'
import type { LocalJSXCommandContext, LocalJSXCommandOnDone } from '../../types/command.js'
import { getAPIProvider, setAPIProviderOverride, type APIProvider } from '../../utils/model/providers.js'
import { hasCopilotCredentials, copilotLogin } from '../../services/copilot/index.js'

const PROVIDER_LABELS: Record<APIProvider, string> = {
  firstParty: 'Anthropic API',
  bedrock: 'AWS Bedrock',
  vertex: 'Google Vertex',
  foundry: 'Azure Foundry',
  copilot: 'GitHub Copilot',
}

const PROVIDER_ALIASES: Record<string, APIProvider> = {
  copilot: 'copilot',
  'github-copilot': 'copilot',
  github: 'copilot',
  anthropic: 'firstParty',
  'first-party': 'firstParty',
  firstparty: 'firstParty',
  default: 'firstParty',
  bedrock: 'bedrock',
  aws: 'bedrock',
  vertex: 'vertex',
  gcp: 'vertex',
  google: 'vertex',
  foundry: 'foundry',
  azure: 'foundry',
}

export async function call(
  onDone: LocalJSXCommandOnDone,
  context: LocalJSXCommandContext,
  args: string,
): Promise<undefined> {
  const current = getAPIProvider()
  const currentLabel = PROVIDER_LABELS[current]

  // No args — show current provider and available options
  if (!args || !args.trim()) {
    const lines = [
      `Current provider: ${chalk.bold.green(currentLabel)}`,
      '',
      'Available providers:',
    ]
    for (const [id, label] of Object.entries(PROVIDER_LABELS)) {
      const marker = id === current ? chalk.green(' ← active') : ''
      lines.push(`  ${chalk.bold(id.padEnd(12))} ${label}${marker}`)
    }
    lines.push('')
    lines.push(`Usage: ${chalk.cyan('/provider copilot')} or ${chalk.cyan('/provider anthropic')}`)
    onDone(lines.join('\n'), { display: 'system' })
    return
  }

  const target = args.trim().toLowerCase()

  // Handle 'login' subcommand
  if (target === 'login') {
    try {
      await copilotLogin()
      setAPIProviderOverride('copilot')
      context.onChangeAPIKey()
      onDone(
        `${chalk.green('✓')} Copilot login successful! Provider switched to ${chalk.bold('GitHub Copilot')}`,
        { display: 'system' },
      )
    } catch (err) {
      onDone(
        `${chalk.red('✗')} Copilot login failed: ${err instanceof Error ? err.message : String(err)}`,
        { display: 'system' },
      )
    }
    return
  }

  // Resolve provider
  const provider = PROVIDER_ALIASES[target]
  if (!provider) {
    onDone(
      `Unknown provider "${target}". Available: ${Object.keys(PROVIDER_ALIASES).join(', ')}`,
      { display: 'system' },
    )
    return
  }

  // If switching to copilot, check credentials
  if (provider === 'copilot') {
    if (!hasCopilotCredentials()) {
      try {
        // Trigger login flow
        await copilotLogin()
      } catch (err) {
        onDone(
          `${chalk.red('✗')} Copilot login failed: ${err instanceof Error ? err.message : String(err)}`,
          { display: 'system' },
        )
        return
      }
    }
  }

  const previousLabel = PROVIDER_LABELS[current]
  setAPIProviderOverride(provider)
  const newLabel = PROVIDER_LABELS[provider]

  // Trigger API key reverification so the REPL status updates
  context.onChangeAPIKey()

  if (provider === current) {
    onDone(`Already using ${chalk.bold(newLabel)}`, { display: 'system' })
  } else {
    onDone(
      `Provider switched: ${chalk.dim(previousLabel)} → ${chalk.bold.green(newLabel)}`,
      { display: 'system' },
    )
  }
}
