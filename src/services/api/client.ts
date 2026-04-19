import Anthropic, { type ClientOptions } from '@ai/sdk'
import { getOauthConfig } from 'src/constants/oauth.js'
import { getUserAgent } from 'src/utils/http.js'
import { getProxyFetchOptions } from 'src/utils/proxy.js'
import {
  getApiKeyFromApiKeyHelper,
  getApiKeyWithSource,
} from 'src/utils/auth.js'
import { getAPIProvider } from 'src/utils/model/providers.js'
import {
  getIsNonInteractiveSession,
  getSessionId,
} from '../../bootstrap/state.js'

import { isDebugToStdErr, logForDebugging } from '../../utils/debug.js'
import { isEnvTruthy } from '../../utils/envUtils.js'

function createStderrLogger(): ClientOptions['logger'] {
  return {
    error: (msg, ...args) =>
      // biome-ignore lint/suspicious/noConsole:: intentional console output -- SDK logger must use console
      console.error('[Anthropic SDK ERROR]', msg, ...args),
    // biome-ignore lint/suspicious/noConsole:: intentional console output -- SDK logger must use console
    warn: (msg, ...args) => console.error('[Anthropic SDK WARN]', msg, ...args),
    // biome-ignore lint/suspicious/noConsole:: intentional console output -- SDK logger must use console
    info: (msg, ...args) => console.error('[Anthropic SDK INFO]', msg, ...args),
    debug: (msg, ...args) =>
      // biome-ignore lint/suspicious/noConsole:: intentional console output -- SDK logger must use console
      console.error('[Anthropic SDK DEBUG]', msg, ...args),
  }
}

export async function getAiClient({
  maxRetries,
  fetchOverride,
  source,
}: {
  apiKey?: string
  maxRetries: number
  model?: string
  fetchOverride?: ClientOptions['fetch']
  source?: string
}): Promise<Anthropic> {
  const containerId = process.env.MYCODE_CONTAINER_ID
  const remoteSessionId = process.env.MYCODE_REMOTE_SESSION_ID
  const clientApp = process.env.MYCODE_AGENT_SDK_CLIENT_APP
  const customHeaders = getCustomHeaders()
  const defaultHeaders: { [key: string]: string } = {
    'x-app': 'cli',
    'User-Agent': getUserAgent(),
    'X-MyCode-Session-Id': getSessionId(),
    ...customHeaders,
    ...(containerId ? { 'x-mycode-remote-container-id': containerId } : {}),
    ...(remoteSessionId
      ? { 'x-mycode-remote-session-id': remoteSessionId }
      : {}),
    // SDK consumers can identify their app/library for backend analytics
    ...(clientApp ? { 'x-client-app': clientApp } : {}),
  }

  // Log API client configuration for HFI debugging
  logForDebugging(
    `[API:request] Creating client, ANTHROPIC_CUSTOM_HEADERS present: ${!!process.env.ANTHROPIC_CUSTOM_HEADERS}, has Authorization header: ${!!customHeaders['Authorization']}`,
  )

  // Add additional protection header if enabled via env var
  if (isEnvTruthy(process.env.MYCODE_ADDITIONAL_PROTECTION)) {
    defaultHeaders['x-anthropic-additional-protection'] = 'true'
  }

  const commonArgs = {
    defaultHeaders,
    maxRetries,
    timeout: parseInt(process.env.API_TIMEOUT_MS || String(600 * 1000), 10),
    dangerouslyAllowBrowser: true,
    fetchOptions: getProxyFetchOptions({
      forAnthropicAPI: true,
    }) as ClientOptions['fetchOptions'],
    ...(isDebugToStdErr() && { logger: createStderrLogger() }),
  } satisfies Partial<ClientOptions>

  if (getAPIProvider() === 'copilot') {
    const { createCopilotFetch } = await import('../../services/copilot/proxy.js')
    const copilotFetch = createCopilotFetch()
    return new Anthropic({
      apiKey: 'copilot-proxy',
      baseURL: 'https://api.githubcopilot.com/v1',
      ...commonArgs,
      fetch: copilotFetch,
    })
  }

  const { key: cachedApiKey, source: apiKeySource } = getApiKeyWithSource()
  const resolvedApiKey =
    apiKey ||
    cachedApiKey ||
    (apiKeySource === 'apiKeyHelper'
      ? await getApiKeyFromApiKeyHelper(getIsNonInteractiveSession())
      : null)

  if (!resolvedApiKey) {
    throw new Error(
      'No API key configured for API provider. Set ANTHROPIC_API_KEY or apiKeyHelper, or switch to /provider copilot.',
    )
  }

  return new Anthropic({
    apiKey: resolvedApiKey,
    baseURL: process.env.ANTHROPIC_BASE_URL || getOauthConfig().BASE_API_URL,
    ...commonArgs,
    ...(fetchOverride && { fetch: fetchOverride }),
  })
}

function getCustomHeaders(): Record<string, string> {
  const customHeaders: Record<string, string> = {}
  const customHeadersEnv = process.env.ANTHROPIC_CUSTOM_HEADERS

  if (!customHeadersEnv) return customHeaders

  // Split by newlines to support multiple headers
  const headerStrings = customHeadersEnv.split(/\n|\r\n/)

  for (const headerString of headerStrings) {
    if (!headerString.trim()) continue

    // Parse header in format "Name: Value" (curl style). Split on first `:`
    // then trim — avoids regex backtracking on malformed long header lines.
    const colonIdx = headerString.indexOf(':')
    if (colonIdx === -1) continue
    const name = headerString.slice(0, colonIdx).trim()
    const value = headerString.slice(colonIdx + 1).trim()
    if (name) {
      customHeaders[name] = value
    }
  }

  return customHeaders
}

export const CLIENT_REQUEST_ID_HEADER = 'x-client-request-id'
