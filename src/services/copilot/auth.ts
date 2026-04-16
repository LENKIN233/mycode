/**
 * GitHub Copilot device code OAuth authentication.
 *
 * Flow:
 * 1. Request device code from GitHub
 * 2. User visits URL and enters code
 * 3. Poll for access token
 * 4. Use access token as refresh token for Copilot API
 *
 * Token is cached to ~/.mycode/copilot_token.json
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'
import { getConfigHomeDir } from '../../utils/envUtils.js'

const COPILOT_CLIENT_ID = 'Iv1.b507a08c87ecfe98'
const DEVICE_CODE_URL = 'https://github.com/login/device/code'
const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const COPILOT_TOKEN_URL =
  'https://api.github.com/copilot_internal/v2/token'

const POLLING_SAFETY_MARGIN_MS = 3000
const COPILOT_EARLY_REFRESH_SECONDS = 300
const COPILOT_STALE_GRACE_SECONDS = 24 * 60 * 60

class CopilotTokenRefreshError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
  ) {
    super(message)
  }
}

interface DeviceCodeResponse {
  verification_uri: string
  user_code: string
  device_code: string
  interval: number
  expires_in: number
}

interface CopilotToken {
  token: string
  expires_at: number // unix timestamp
}

interface StoredAuth {
  github_token: string
  copilot_token?: string
  copilot_expires_at?: number
}

function getTokenPath(): string {
  const configDir = getConfigHomeDir()
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }
  return join(configDir, 'copilot_token.json')
}

function loadStoredAuth(): StoredAuth | null {
  const tokenPath = getTokenPath()
  if (!existsSync(tokenPath)) return null
  try {
    return JSON.parse(readFileSync(tokenPath, 'utf-8'))
  } catch {
    return null
  }
}

function saveStoredAuth(auth: StoredAuth): void {
  const tokenPath = getTokenPath()
  const tempPath = `${tokenPath}.tmp.${process.pid}.${Date.now()}`
  writeFileSync(tempPath, JSON.stringify(auth, null, 2), {
    mode: 0o600,
  })
  renameSync(tempPath, tokenPath)
}

/**
 * Clear the cached Copilot API token (but keep the GitHub token).
 * Called when the Copilot API returns 401, indicating the cached token
 * is stale (e.g. system clock was wrong when it was obtained).
 */
export function invalidateCopilotToken(): void {
  const stored = loadStoredAuth()
  if (stored) {
    saveStoredAuth({
      ...stored,
      copilot_token: undefined,
      copilot_expires_at: undefined,
    })
  }
}

/**
 * Request a device code from GitHub for OAuth device flow.
 */
async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const response = await fetch(DEVICE_CODE_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: COPILOT_CLIENT_ID,
      scope: 'read:user',
    }),
  })

  if (!response.ok) {
    throw new Error(
      `Failed to request device code: ${response.status} ${response.statusText}`,
    )
  }

  return response.json()
}

/**
 * Poll GitHub for access token after user enters the device code.
 */
async function pollForAccessToken(
  deviceCode: string,
  interval: number,
  signal?: AbortSignal,
): Promise<string> {
  const sleep = (ms: number) =>
    new Promise<void>((resolve, reject) => {
      if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return }
      const timer = setTimeout(resolve, ms)
      // Use unref() so the polling loop doesn't keep the process alive
      // when the only remaining work is waiting for user authorization.
      // The process can still exit normally; if it does, the poll is abandoned.
      if (typeof timer === 'object' && timer !== null && 'unref' in timer) {
        ;(timer as NodeJS.Timeout).unref()
      }
      signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')) }, { once: true })
    })

  while (true) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const response = await fetch(ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: COPILOT_CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
      signal,
    })

    if (!response.ok) {
      throw new Error(
        `Token polling failed: ${response.status} ${response.statusText}`,
      )
    }

    const data = (await response.json()) as {
      access_token?: string
      error?: string
      interval?: number
    }

    if (data.access_token) {
      return data.access_token
    }

    if (data.error === 'authorization_pending') {
      await sleep(interval * 1000 + POLLING_SAFETY_MARGIN_MS)
      continue
    }

    if (data.error === 'slow_down') {
      const newInterval =
        data.interval && typeof data.interval === 'number' && data.interval > 0
          ? data.interval * 1000
          : (interval + 5) * 1000
      await sleep(newInterval + POLLING_SAFETY_MARGIN_MS)
      continue
    }

    if (data.error === 'expired_token') {
      throw new Error('Device code expired. Please try again.')
    }

    if (data.error) {
      throw new Error(`OAuth error: ${data.error}`)
    }

    await sleep(interval * 1000 + POLLING_SAFETY_MARGIN_MS)
  }
}

/**
 * Exchange GitHub access token for a Copilot API token.
 */
async function getCopilotApiToken(
  githubToken: string,
): Promise<CopilotToken> {
  let response: Response
  try {
    response = await fetch(COPILOT_TOKEN_URL, {
      method: 'GET',
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/json',
        'User-Agent': 'mycode-rev/1.0',
      },
    })
  } catch (error) {
    throw new CopilotTokenRefreshError(
      `Failed to refresh Copilot API token: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  if (!response.ok) {
    const text = await response.text()
    throw new CopilotTokenRefreshError(
      `Failed to get Copilot API token: ${response.status} ${text}`,
      response.status,
    )
  }

  const data = (await response.json()) as {
    token: string
    expires_at: number
  }

  return {
    token: data.token,
    expires_at: data.expires_at,
  }
}

/**
 * Run the interactive device code login flow.
 * Prints instructions to stderr so stdout stays clean.
 */
export async function copilotLogin(): Promise<string> {
  // biome-ignore lint/suspicious/noConsole: intentional user-facing output
  console.error('Requesting GitHub device code...')

  const deviceData = await requestDeviceCode()

  // biome-ignore lint/suspicious/noConsole: intentional user-facing output
  console.error(
    `\nPlease visit: ${deviceData.verification_uri}\nEnter code: ${deviceData.user_code}\n`,
  )
  // biome-ignore lint/suspicious/noConsole: intentional user-facing output
  console.error('Waiting for authorization...')

  const githubToken = await pollForAccessToken(
    deviceData.device_code,
    deviceData.interval,
  )

  // biome-ignore lint/suspicious/noConsole: intentional user-facing output
  console.error('GitHub authorization successful!')

  // Get a Copilot token to verify access
  const copilotToken = await getCopilotApiToken(githubToken)

  saveStoredAuth({
    github_token: githubToken,
    copilot_token: copilotToken.token,
    copilot_expires_at: copilotToken.expires_at,
  })

  // biome-ignore lint/suspicious/noConsole: intentional user-facing output
  console.error('Copilot token saved to ~/.mycode/copilot_token.json')
  // biome-ignore lint/suspicious/noConsole: intentional user-facing output
  console.error(
    '\nYou can now use Copilot by setting: MYCODE_USE_COPILOT=1',
  )

  return githubToken
}

/**
 * Get a valid Copilot API token, refreshing if necessary.
 * If the GitHub OAuth token is also expired, behaviour depends on autoLogin:
 *   - true (default): runs the interactive device code flow via console.error
 *   - false: throws so the caller can handle re-auth in its own UI (e.g. TUI)
 */
export async function getCopilotToken(
  options?: { autoLogin?: boolean },
): Promise<string> {
  const autoLogin = options?.autoLogin ?? true

  const stored = loadStoredAuth()
  if (!stored) {
    if (!autoLogin) {
      throw new Error('No Copilot credentials found. Please run /provider login.')
    }
    // biome-ignore lint/suspicious/noConsole: intentional user-facing output
    console.error('\nNo Copilot credentials found. Starting login flow...')
    await copilotLogin()
    return getCopilotToken(options)
  }

  // Check if we have a cached Copilot token that's still valid
  // Refresh 5 minutes before expiry
  if (
    stored.copilot_token &&
    stored.copilot_expires_at &&
    stored.copilot_expires_at > Date.now() / 1000 + COPILOT_EARLY_REFRESH_SECONDS
  ) {
    return stored.copilot_token
  }

  // Refresh the Copilot token using the stored GitHub token
  try {
    const copilotToken = await getCopilotApiToken(stored.github_token)

    saveStoredAuth({
      ...stored,
      copilot_token: copilotToken.token,
      copilot_expires_at: copilotToken.expires_at,
    })

    return copilotToken.token
  } catch (error) {
    const now = Date.now() / 1000
    const hasStaleCopilotToken =
      !!stored.copilot_token &&
      !!stored.copilot_expires_at &&
      stored.copilot_expires_at > now - COPILOT_STALE_GRACE_SECONDS

    // Network/server hiccups should not force a re-login. Keep using the
    // previous Copilot token and let the request path decide via 401 handling.
    const isAuthInvalidation =
      error instanceof CopilotTokenRefreshError &&
      (error.statusCode === 401 || error.statusCode === 403)

    if (!isAuthInvalidation && hasStaleCopilotToken) {
      return stored.copilot_token!
    }

    if (!autoLogin) {
      throw new Error(
        isAuthInvalidation
          ? 'Copilot session expired. Re-authentication required.'
          : `Unable to refresh Copilot session: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
    // Only force re-auth for explicit auth invalidation (401/403).
    if (!isAuthInvalidation) {
      throw new Error(
        `Unable to refresh Copilot session. Please retry. ${error instanceof Error ? error.message : String(error)}`,
      )
    }

    // GitHub token is invalid/expired — automatically re-authenticate
    // biome-ignore lint/suspicious/noConsole: intentional user-facing output
    console.error(
      '\nCopilot session expired. Re-authenticating...',
    )
    await copilotLogin()
    return getCopilotToken(options)
  }
}

/**
 * Request a device code and start a background polling flow for auth.
 * Returns the verification info so callers (like the proxy error handler
 * in TUI mode) can display it however they need.
 */
export async function requestCopilotReauth(signal?: AbortSignal): Promise<{
  verification_uri: string
  user_code: string
  pollPromise: Promise<void>
}> {
  const deviceData = await requestDeviceCode()

  const pollPromise = (async () => {
    const githubToken = await pollForAccessToken(
      deviceData.device_code,
      deviceData.interval,
      signal,
    )
    const copilotToken = await getCopilotApiToken(githubToken)
    saveStoredAuth({
      github_token: githubToken,
      copilot_token: copilotToken.token,
      copilot_expires_at: copilotToken.expires_at,
    })
  })()

  return {
    verification_uri: deviceData.verification_uri,
    user_code: deviceData.user_code,
    pollPromise,
  }
}

/**
 * Check if Copilot credentials are stored.
 */
export function hasCopilotCredentials(): boolean {
  return loadStoredAuth() !== null
}
