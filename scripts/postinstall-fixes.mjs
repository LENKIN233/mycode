import { existsSync, mkdirSync, rmSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'

// Create @ai/* aliases pointing to @anthropic-ai/* packages
const nmDir = join(process.cwd(), 'node_modules')
const aiDir = join(nmDir, '@ai')
mkdirSync(aiDir, { recursive: true })
for (const pkg of ['sdk', 'mcpb', 'sandbox-runtime']) {
  const target = join(aiDir, pkg)
  const source = join(nmDir, '@anthropic-ai', pkg)
  if (existsSync(source)) {
    if (existsSync(target)) rmSync(target, { recursive: true })
    symlinkSync(source, target)
  }
}

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