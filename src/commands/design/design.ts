import { access, mkdir, readdir, stat } from 'fs/promises'
import { isAbsolute, join, relative } from 'path'
import * as React from 'react'
import { Select, type OptionWithDescription } from '../../components/CustomSelect/index.js'
import { Pane } from '../../components/design-system/Pane.js'
import { Box, Text } from '../../ink.js'
import type { LocalJSXCommandCall } from '../../types/command.js'
import { openPath } from '../../utils/browser.js'
import { getCwd } from '../../utils/cwd.js'
import { writeFileSync_DEPRECATED } from '../../utils/slowOperations.js'
import {
  buildDesignFollowupPrompt,
  DESIGN_ARTIFACT_DIR,
  inferDesignTemplate,
  parseDesignCommandArgs,
  sanitizeDesignSlug,
  titleFromDesignBrief,
} from './helpers.js'
import { buildDesignStarterHtml } from './starter.js'
import {
  inferDesignTemplateFromArtifactFile,
  verifyDesignArtifactFile,
} from './verify.js'
import {
  type DesignArtifactMetadata,
  readDesignArtifactManifest,
  upsertDesignArtifactManifest,
  upsertDesignArtifactMetadata,
} from './metadata.js'

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
  const dir = join(cwd, DESIGN_ARTIFACT_DIR)
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

async function getLatestArtifactPath(artifactDir: string): Promise<string | null> {
  const entries = await readdir(artifactDir, { withFileTypes: true })
  const htmlFiles = entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.html'))
    .map(entry => join(artifactDir, entry.name))

  if (htmlFiles.length === 0) {
    return null
  }

  const stats = await Promise.all(
    htmlFiles.map(async filePath => ({
      filePath,
      mtimeMs: (await stat(filePath)).mtimeMs,
    })),
  )

  stats.sort((a, b) => b.mtimeMs - a.mtimeMs)
  return stats[0]?.filePath ?? null
}

function resolveArtifactPath(cwd: string, fileArg: string): string {
  return isAbsolute(fileArg) ? fileArg : join(cwd, fileArg)
}

type ArtifactListProps = {
  artifacts: DesignArtifactMetadata[]
  onDone: Parameters<LocalJSXCommandCall>[0]
}

function relativeTimeLabel(timestamp: string): string {
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) {
    return timestamp || 'unknown'
  }

  const deltaMs = Date.now() - parsed.getTime()
  const minutes = Math.max(1, Math.round(deltaMs / 60000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

function ArtifactListMenu({
  artifacts,
  onDone,
}: ArtifactListProps): React.ReactNode {
  const options: OptionWithDescription[] = artifacts.map(artifact => ({
    label: artifact.title,
    description: `${artifact.template} · ${artifact.lastAction} · ${relativeTimeLabel(artifact.updatedAt)}`,
    value: artifact.path,
  }))

  return React.createElement(
    Pane,
    { color: 'permission' },
    React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { bold: true }, 'Claude Design Artifacts'),
      React.createElement(
        Text,
        { dimColor: true },
        'Select an artifact to reopen and continue iterating.',
      ),
      React.createElement(
        Box,
        { marginTop: 1 },
        React.createElement(Select, {
          options,
          onChange: value => {
            onDone('Opening selected design artifact…', {
              display: 'system',
              nextInput: `/design --file "${value}"`,
              submitNextInput: true,
            })
          },
          onCancel: () =>
            onDone('Design artifact browser dismissed', { display: 'system' }),
          visibleOptionCount: Math.min(10, options.length),
          hideIndexes: false,
        }),
      ),
    ),
  )
}

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  const {
    brief,
    template: explicitTemplate,
    file,
    latest,
    list,
  } = parseDesignCommandArgs(args)
  const cwd = getCwd()
  const artifactDir = join(cwd, DESIGN_ARTIFACT_DIR)
  const timestamp = new Date().toLocaleString()

  await mkdir(artifactDir, { recursive: true })

  if (list) {
    const manifest = await readDesignArtifactManifest(cwd)
    if (manifest.artifacts.length === 0) {
      onDone('No design artifacts found yet. Run /design <brief> to create one.', {
        display: 'system',
      })
      return null
    }

    return React.createElement(ArtifactListMenu, {
      artifacts: manifest.artifacts,
      onDone,
    })
  }

  const targetArtifactPath = file
    ? resolveArtifactPath(cwd, file)
    : latest
      ? await getLatestArtifactPath(artifactDir)
      : null

  if (targetArtifactPath) {
    if (!(await pathExists(targetArtifactPath))) {
      onDone(`Design artifact not found: ${targetArtifactPath}`, {
        display: 'system',
      })
      return null
    }

    const relativeArtifactPath = relative(cwd, targetArtifactPath)
    const template =
      explicitTemplate ??
      (await inferDesignTemplateFromArtifactFile(targetArtifactPath))
    const title = titleFromDesignBrief(brief || relativeArtifactPath)
    const opened = await openPath(targetArtifactPath)
    const verification = await verifyDesignArtifactFile(
      targetArtifactPath,
      template,
    )
    const metadata = await upsertDesignArtifactMetadata({
      cwd,
      relativeArtifactPath,
      title,
      template,
      brief,
      timestamp,
      action: 'continued',
    })
    await upsertDesignArtifactManifest({
      cwd,
      metadata,
      timestamp,
    })
    const warningSuffix =
      verification.warnings.length > 0
        ? `\nVerification warnings: ${verification.warnings.join('; ')}`
        : ''
    const previewSuffix = opened
      ? '\nOpened preview'
      : '\nPreview did not open automatically'

    onDone(
      `Opened existing ${template} design artifact: ${targetArtifactPath}${previewSuffix} and queued the design workflow.${warningSuffix}`,
      {
        display: 'system',
        nextInput: buildDesignFollowupPrompt(
          brief,
          relativeArtifactPath,
          template,
        ),
        submitNextInput: true,
      },
    )

    return null
  }

  const template = explicitTemplate ?? inferDesignTemplate(brief)
  const title = titleFromDesignBrief(brief)
  const slug = sanitizeDesignSlug(title)

  const artifactPath = await getVersionedArtifactPath(slug)
  const relativeArtifactPath = relative(cwd, artifactPath)
  const html = buildDesignStarterHtml(
    title,
    brief,
    timestamp,
    template,
  )

  writeFileSync_DEPRECATED(artifactPath, html, {
    encoding: 'utf-8',
    flush: true,
  })

  const opened = await openPath(artifactPath)
  const verification = await verifyDesignArtifactFile(artifactPath, template)
  const metadata = await upsertDesignArtifactMetadata({
    cwd,
    relativeArtifactPath,
    title,
    template,
    brief,
    timestamp,
    action: 'created',
  })
  await upsertDesignArtifactManifest({
    cwd,
    metadata,
    timestamp,
  })
  const warningSuffix =
    verification.warnings.length > 0
      ? `\nVerification warnings: ${verification.warnings.join('; ')}`
      : ''
  const previewSuffix = opened
    ? '\nOpened preview'
    : '\nPreview did not open automatically'

  const message = brief
    ? `Created ${template} design artifact starter: ${artifactPath}${previewSuffix} and queued the design workflow.${warningSuffix}`
    : `Created ${template} design artifact starter: ${artifactPath}${previewSuffix}. Re-run /design with a brief to auto-start the design workflow.${warningSuffix}`

  onDone(message, {
    display: 'system',
    ...(brief
      ? {
          nextInput: buildDesignFollowupPrompt(
            brief,
            relativeArtifactPath,
            template,
          ),
          submitNextInput: true,
        }
      : {}),
  })

  return null
}
