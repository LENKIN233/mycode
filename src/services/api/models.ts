import { createHash } from 'crypto'
import { getOauthConfig } from 'src/constants/oauth.js'
import { getUserAgent } from 'src/utils/http.js'
import { getApiKeyFromApiKeyHelper, getApiKeyWithSource } from 'src/utils/auth.js'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'

const CACHE_TTL_MS = 60 * 60 * 1000
const MAX_PERSISTED_ENDPOINTS = 20

export type APIModelInfo = {
  id: string
  displayName: string
}

interface ModelsCache {
  models: Map<string, APIModelInfo>
  fetchedAt: number
}

let cache: ModelsCache | null = null
let fetchPromise: Promise<Map<string, APIModelInfo>> | null = null

function getApiModelsBaseUrl(): string {
  return (process.env.ANTHROPIC_BASE_URL || getOauthConfig().BASE_API_URL).replace(/\/$/, '')
}

function getApiModelsCacheKey(baseUrl: string, apiKey: string): string {
  const fingerprint = createHash('sha256').update(apiKey).digest('hex').slice(0, 16)
  return `${baseUrl}::${fingerprint}`
}

function parseModel(raw: unknown): APIModelInfo | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const record = raw as Record<string, unknown>
  const id = typeof record.id === 'string' ? record.id.trim() : ''
  if (!id) {
    return null
  }

  const displayName =
    (typeof record.display_name === 'string' && record.display_name.trim()) ||
    (typeof record.name === 'string' && record.name.trim()) ||
    id

  return {
    id,
    displayName,
  }
}

function parseModelsResponse(data: unknown): Map<string, APIModelInfo> {
  const values = Array.isArray(data)
    ? data
    : Array.isArray((data as { data?: unknown[] } | null)?.data)
      ? ((data as { data: unknown[] }).data)
      : []

  const models = new Map<string, APIModelInfo>()
  for (const raw of values) {
    const parsed = parseModel(raw)
    if (parsed) {
      models.set(parsed.id, parsed)
    }
  }
  return models
}

async function getResolvedApiKey(): Promise<string | null> {
  const { key: cachedApiKey, source } = getApiKeyWithSource()
  if (cachedApiKey) {
    return cachedApiKey
  }
  if (source === 'apiKeyHelper') {
    return await getApiKeyFromApiKeyHelper(false)
  }
  return null
}

function writePersistentCache(
  cacheKey: string,
  models: Map<string, APIModelInfo>,
  timestamp: number,
): void {
  saveGlobalConfig(current => {
    const nextCache = {
      ...(current.discoveredApiModelsCache ?? {}),
      [cacheKey]: {
        models: [...models.values()],
        timestamp,
      },
    }

    const trimmedEntries = Object.entries(nextCache)
      .sort(([, left], [, right]) => right.timestamp - left.timestamp)
      .slice(0, MAX_PERSISTED_ENDPOINTS)

    return {
      ...current,
      discoveredApiModelsCache: Object.fromEntries(trimmedEntries),
    }
  })
}

function getPersistentCache(
  cacheKey: string,
): Map<string, APIModelInfo> | null {
  const cached = getGlobalConfig().discoveredApiModelsCache?.[cacheKey]
  if (!cached) {
    return null
  }

  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    return null
  }

  return new Map(
    cached.models
      .filter(
        model =>
          typeof model?.id === 'string' &&
          typeof model?.displayName === 'string',
      )
      .map(model => [model.id, model]),
  )
}

async function fetchModels(): Promise<Map<string, APIModelInfo>> {
  const apiKey = await getResolvedApiKey()
  if (!apiKey) {
    return new Map()
  }

  const baseUrl = getApiModelsBaseUrl()
  const cacheKey = getApiModelsCacheKey(baseUrl, apiKey)
  const persistentCache = getPersistentCache(cacheKey)
  if (persistentCache && persistentCache.size > 0) {
    cache = { models: persistentCache, fetchedAt: Date.now() }
    return persistentCache
  }

  const candidates = [`${baseUrl}/v1/models`, `${baseUrl}/models`]

  for (const url of candidates) {
    try {
      const resp = await fetch(url, {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'User-Agent': getUserAgent(),
        },
      })

      if (!resp.ok) {
        continue
      }

      const models = parseModelsResponse(await resp.json())
      if (models.size > 0) {
        writePersistentCache(cacheKey, models, Date.now())
      }
      return models
    } catch {
      continue
    }
  }

  return new Map()
}

export async function getAvailableAPIModels(): Promise<APIModelInfo[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return [...cache.models.values()]
  }

  if (!fetchPromise) {
    fetchPromise = fetchModels()
      .then(models => {
        cache = { models, fetchedAt: Date.now() }
        fetchPromise = null
        return models
      })
      .catch(() => {
        fetchPromise = null
        return cache?.models ?? new Map()
      })
  }

  return [...(await fetchPromise).values()]
}

export function getCachedAvailableAPIModels(): APIModelInfo[] {
  return [...(cache?.models.values() ?? [])]
}

export function warmAPIModelCache(): void {
  getAvailableAPIModels().catch(() => {})
}

export { parseModelsResponse }
