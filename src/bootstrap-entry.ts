import { ensureBootstrapMacro } from './bootstrapMacro'

if (!process.env.MYCODE_DISABLE_ANTHROPIC_OFFICIAL) {
	process.env.MYCODE_DISABLE_ANTHROPIC_OFFICIAL = '1'
}

ensureBootstrapMacro()

await import('./entrypoints/cli.tsx')
