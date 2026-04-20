import { access, mkdir } from 'fs/promises'
import { join } from 'path'
import type { LocalJSXCommandCall } from '../../types/command.js'
import { openPath } from '../../utils/browser.js'
import { getCwd } from '../../utils/cwd.js'
import { writeFileSync_DEPRECATED } from '../../utils/slowOperations.js'
import { buildDesignStarterHtml } from './starter.js'

const ARTIFACT_DIR = join('artifacts', 'claude-design')

function sanitizeSlug(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return slug || 'design-artifact'
}

function titleFromBrief(brief: string): string {
  if (!brief.trim()) return 'Design Artifact'
  const line = brief.trim().split('\n')[0] || 'Design Artifact'
  return line.length > 60 ? `${line.slice(0, 57)}...` : line
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function getVersionedArtifactPath(slug: string): Promise<string> {
  const cwd = getCwd()
  const dir = join(cwd, ARTIFACT_DIR)
  const base = join(dir, `${slug}.html`)

  if (!(await pathExists(base))) {
    return base
  }

  let version = 2
  while (await pathExists(join(dir, `${slug}-v${version}.html`))) {
    version++
  }

  return join(dir, `${slug}-v${version}.html`)
}

function buildFollowupPrompt(brief: string, relativeFilePath: string): string {
  return [
    `Use the claude-design agent to create or refine the HTML artifact at \`${relativeFilePath}\`.`,
    'Start from the existing starter file instead of rebuilding from scratch.',
    'Ground the design in local project context first, especially nearby UI and the design-system components under `src/components/design-system/` when relevant.',
    'If the brief benefits from exploration, present multiple visual directions inside the same artifact rather than making just one safe option.',
    'Preserve version history for major revisions by creating a versioned copy instead of overwriting blindly.',
    '',
    `Design brief: ${brief.trim() || 'Create a first-pass exploratory design artifact and replace the starter placeholders with a real direction.'}`,
  ].join('\n')
}

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  const brief = args.trim()
  const cwd = getCwd()
  const title = titleFromBrief(brief)
  const slug = sanitizeSlug(title)
  const artifactDir = join(cwd, ARTIFACT_DIR)

  await mkdir(artifactDir, { recursive: true })

  const artifactPath = await getVersionedArtifactPath(slug)
  const relativeArtifactPath = artifactPath.slice(cwd.length + 1)
  const html = buildDesignStarterHtml(
    title,
    brief,
    new Date().toLocaleString(),
  )

  writeFileSync_DEPRECATED(artifactPath, html, {
    encoding: 'utf-8',
    flush: true,
  })

  void openPath(artifactPath)

  const message = brief
    ? `Created design artifact starter: ${artifactPath}\nOpened preview and queued the design workflow.`
    : `Created design artifact starter: ${artifactPath}\nOpened preview. Re-run /design with a brief to auto-start the design workflow.`

  onDone(message, {
    display: 'system',
    ...(brief
      ? {
          nextInput: buildFollowupPrompt(brief, relativeArtifactPath),
          submitNextInput: true,
        }
      : {}),
  })

  return null
}
