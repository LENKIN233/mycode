import { existsSync, mkdirSync, rmSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'

// Create @ai/* aliases pointing to @anthropic-ai/* packages
const aiDir = join(process.cwd(), 'node_modules', '@ai')
mkdirSync(aiDir, { recursive: true })
for (const pkg of ['sdk', 'mcpb', 'sandbox-runtime']) {
  const target = join(aiDir, pkg)
  const source = join('..', '..', '@anthropic-ai', pkg)
  if (!existsSync(target) && existsSync(join(process.cwd(), 'node_modules', '@anthropic-ai', pkg))) {
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