import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const anthropicSdkSourceTsconfig = join(
  process.cwd(),
  'node_modules',
  '@anthropic-ai',
  'sdk',
  'src',
  'tsconfig.json',
)

if (existsSync(anthropicSdkSourceTsconfig)) {
  rmSync(anthropicSdkSourceTsconfig)
}