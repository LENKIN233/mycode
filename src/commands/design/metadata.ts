import { access, mkdir, readFile } from 'fs/promises'
import { dirname, join } from 'path'
import { writeFileSync_DEPRECATED } from '../../utils/slowOperations.js'
import { DESIGN_ARTIFACT_DIR, type DesignTemplate } from './helpers.js'

export type DesignArtifactMetadata = {
  path: string
  title: string
  template: DesignTemplate
  brief: string
  createdAt: string
  updatedAt: string
  lastAction: 'created' | 'continued'
  revisionBasePath: string
}

export type DesignArtifactManifest = {
  updatedAt: string
  artifacts: DesignArtifactMetadata[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function getDesignArtifactMetaPath(relativeArtifactPath: string): string {
  return `${relativeArtifactPath}.meta.json`
}

export function getDesignArtifactManifestPath(cwd: string): string {
  return join(cwd, DESIGN_ARTIFACT_DIR, 'manifest.json')
}

export function getRevisionBasePath(relativeArtifactPath: string): string {
  return relativeArtifactPath.replace(/-v\d+\.html$/i, '.html')
}

function normalizeMetadata(
  input: unknown,
  fallback: DesignArtifactMetadata,
): DesignArtifactMetadata {
  if (!isRecord(input)) return fallback

  return {
    path:
      typeof input.path === 'string' && input.path.trim()
        ? input.path
        : fallback.path,
    title:
      typeof input.title === 'string' && input.title.trim()
        ? input.title
        : fallback.title,
    template:
      input.template === 'canvas' ||
      input.template === 'prototype' ||
      input.template === 'deck'
        ? input.template
        : fallback.template,
    brief: typeof input.brief === 'string' ? input.brief : fallback.brief,
    createdAt:
      typeof input.createdAt === 'string' && input.createdAt.trim()
        ? input.createdAt
        : fallback.createdAt,
    updatedAt:
      typeof input.updatedAt === 'string' && input.updatedAt.trim()
        ? input.updatedAt
        : fallback.updatedAt,
    lastAction:
      input.lastAction === 'continued' ? 'continued' : fallback.lastAction,
    revisionBasePath:
      typeof input.revisionBasePath === 'string' && input.revisionBasePath.trim()
        ? input.revisionBasePath
        : fallback.revisionBasePath,
  }
}

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const content = await readFile(path, 'utf-8')
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

export async function upsertDesignArtifactMetadata(params: {
  cwd: string
  relativeArtifactPath: string
  title: string
  template: DesignTemplate
  brief: string
  timestamp: string
  action: 'created' | 'continued'
}): Promise<DesignArtifactMetadata> {
  const {
    cwd,
    relativeArtifactPath,
    title,
    template,
    brief,
    timestamp,
    action,
  } = params

  const metaPath = join(cwd, getDesignArtifactMetaPath(relativeArtifactPath))
  const fallback: DesignArtifactMetadata = {
    path: relativeArtifactPath,
    title,
    template,
    brief,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastAction: action,
    revisionBasePath: getRevisionBasePath(relativeArtifactPath),
  }

  const existing = normalizeMetadata(
    await readJsonFile<DesignArtifactMetadata>(metaPath),
    fallback,
  )

  const metadata: DesignArtifactMetadata = {
    ...existing,
    path: relativeArtifactPath,
    title,
    template,
    brief: brief || existing.brief,
    updatedAt: timestamp,
    lastAction: action,
    revisionBasePath: getRevisionBasePath(relativeArtifactPath),
  }

  await mkdir(dirname(metaPath), { recursive: true })
  writeFileSync_DEPRECATED(metaPath, JSON.stringify(metadata, null, 2), {
    encoding: 'utf-8',
    flush: true,
  })

  return metadata
}

export async function upsertDesignArtifactManifest(params: {
  cwd: string
  metadata: DesignArtifactMetadata
  timestamp: string
}): Promise<DesignArtifactManifest> {
  const manifestPath = getDesignArtifactManifestPath(params.cwd)
  const existing = await readJsonFile<DesignArtifactManifest>(manifestPath)
  const artifacts = Array.isArray(existing?.artifacts) ? existing.artifacts : []
  const existingWithFiles = (
    await Promise.all(
      artifacts.map(async item => ({
        item,
        exists: await fileExists(join(params.cwd, item.path)),
      })),
    )
  )
    .filter(entry => entry.exists)
    .map(entry => entry.item)

  const filtered = existingWithFiles.filter(
    item => item.path !== params.metadata.path,
  )
  filtered.push(params.metadata)
  filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  const manifest: DesignArtifactManifest = {
    updatedAt: params.timestamp,
    artifacts: filtered,
  }

  await mkdir(dirname(manifestPath), { recursive: true })
  writeFileSync_DEPRECATED(manifestPath, JSON.stringify(manifest, null, 2), {
    encoding: 'utf-8',
    flush: true,
  })

  return manifest
}

export async function readDesignArtifactManifest(
  cwd: string,
): Promise<DesignArtifactManifest> {
  const manifestPath = getDesignArtifactManifestPath(cwd)
  const existing = await readJsonFile<DesignArtifactManifest>(manifestPath)
  const artifacts = Array.isArray(existing?.artifacts) ? existing.artifacts : []
  const existingWithFiles = (
    await Promise.all(
      artifacts.map(async item => ({
        item,
        exists: await fileExists(join(cwd, item.path)),
      })),
    )
  )
    .filter(entry => entry.exists)
    .map(entry => entry.item)

  return {
    updatedAt:
      typeof existing?.updatedAt === 'string' ? existing.updatedAt : '',
    artifacts: existingWithFiles,
  }
}
