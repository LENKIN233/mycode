import chalk from 'chalk'
import type { LocalJSXCommandContext, LocalJSXCommandOnDone } from '../../types/command.js'
import { getAPIProvider, setAPIProviderOverride, type APIProvider } from '../../utils/model/providers.js'
import { hasCopilotCredentials, copilotLogin } from '../../services/copilot/index.js'

const PROVIDER_LABELS: Record<APIProvider, string> = {
  copilot: 'GitHub Copilot',
  firstParty: 'Manual API / Compatible Endpoint',
  bedrock: 'Unsupported',
  vertex: 'Unsupported',
  foundry: 'Unsupported',
}

const AVAILABLE_PROVIDER_OPTIONS = [
  { id: 'copilot', provider: 'copilot' as const },
  { id: 'api', provider: 'firstParty' as const },
]

const PROVIDER_ALIASES: Record<string, APIProvider> = {
  api: 'firstParty',
  anthropic: 'firstParty',
  manual: 'firstParty',
  local: 'firstParty',
  'first-party': 'firstParty',
  firstparty: 'firstParty',
  copilot: 'copilot',
  'github-copilot': 'copilot',
  github: 'copilot',
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
    for (const option of AVAILABLE_PROVIDER_OPTIONS) {
      const marker = option.provider === current ? chalk.green(' ← active') : ''
      lines.push(
        `  ${chalk.bold(option.id.padEnd(12))} ${PROVIDER_LABELS[option.provider]}${marker}`,
      )
    }
    lines.push('')
    lines.push(`Usage: ${chalk.cyan('/provider copilot')} or ${chalk.cyan('/provider api')}`)
    lines.push(`API mode uses ${chalk.bold('ANTHROPIC_API_KEY')} and optional ${chalk.bold('ANTHROPIC_BASE_URL')}`)
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
