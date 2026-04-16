import { ensureBootstrapMacro } from './bootstrapMacro'

// Only GitHub Copilot is supported; disable all Anthropic first-party paths
process.env.MYCODE_DISABLE_ANTHROPIC_OFFICIAL = '1'

ensureBootstrapMacro()

await import('./entrypoints/cli.tsx')
