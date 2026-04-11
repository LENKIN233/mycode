/**
 * Dynamic model discovery from the Copilot /models API.
 *
 * Fetches and caches the list of available models so that proxy.ts can
 * validate model availability and use correct output-token limits without
 * hardcoding.
 */

import { getCopilotToken } from './auth.js'

const COPILOT_API_BASE = 'https://api.githubcopilot.com'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

export interface CopilotModelInfo {
  id: string
  name: string
  vendor: string
  category?: string // "powerful" | "versatile" | "lightweight"
  maxOutputTokens?: number
  maxPromptTokens?: number
  maxContextTokens?: number
  supportsReasoning?: string[] // ["low","medium","high"]
  supportsChatCompletions: boolean
  supportsMessages: boolean
  enabled: boolean
  preview: boolean
}

interface ModelsCache {
  models: Map<string, CopilotModelInfo>
  fetchedAt: number
}

let cache: ModelsCache | null = null
let fetchPromise: Promise<Map<string, CopilotModelInfo>> | null = null

function parseModel(raw: any): CopilotModelInfo {
  const limits = raw.capabilities?.limits
  const supports = raw.capabilities?.supports
  const endpoints: string[] = raw.supported_endpoints ?? []
  return {
    id: raw.id,
    name: raw.name ?? raw.id,
    vendor: raw.vendor ?? 'unknown',
    category: raw.model_picker_category,
    maxOutputTokens: limits?.max_output_tokens,
    maxPromptTokens: limits?.max_prompt_tokens,
    maxContextTokens: limits?.max_context_window_tokens,
    supportsReasoning: supports?.reasoning_effort,
    supportsChatCompletions: endpoints.includes('/chat/completions'),
    supportsMessages: endpoints.includes('/v1/messages'),
    enabled: raw.model_picker_enabled ?? false,
    preview: raw.preview ?? false,
  }
}

async function fetchModels(): Promise<Map<string, CopilotModelInfo>> {
  // Never trigger interactive auth from cache warm-up.
  const token = await getCopilotToken({ autoLogin: false })
  const resp = await fetch(`${COPILOT_API_BASE}/models`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Copilot-Integration-Id': 'vscode-chat',
    },
  })

  if (!resp.ok) {
    throw new Error(`Copilot /models API failed: ${resp.status}`)
  }

  const data = (await resp.json()) as { data: any[] }
  const map = new Map<string, CopilotModelInfo>()
  for (const raw of data.data) {
    const info = parseModel(raw)
    map.set(info.id, info)
  }
  return map
}

/**
 * Get all available Copilot models (cached, 1h TTL).
 * Returns empty map on network failure (non-blocking).
 */
export async function getCopilotModels(): Promise<Map<string, CopilotModelInfo>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.models
  }

  // Deduplicate concurrent fetches
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
  return fetchPromise
}

/**
 * Get max output tokens for a model from the API-reported limits.
 * Returns undefined if model not found or cache empty.
 */
export function getCopilotModelMaxOutput(id: string): number | undefined {
  return cache?.models.get(id)?.maxOutputTokens
}

/**
 * Eagerly warm the model cache. Call early in startup.
 * Non-blocking — errors are silently swallowed.
 */
export function warmModelCache(): void {
  getCopilotModels().catch(() => {})
}
