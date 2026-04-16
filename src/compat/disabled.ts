/**
 * Centralized stubs for features that are disabled in this fork.
 *
 * Instead of scattering inline stubs (`const X = () => null`) across
 * main.tsx, REPL.tsx, sessionHistory.ts, etc., all disabled-feature
 * exports live here. Each section documents what was disabled and why.
 *
 * Rules:
 *   - Every export must have a one-line comment explaining the stub
 *   - Group by feature area
 *   - If a feature becomes implementable, move its stubs out and
 *     replace with a real implementation — do NOT leave dead stubs
 */

// ── Bootstrap API ──────────────────────────────────────────────────
// Anthropic bootstrap endpoint — fetches client config at startup.
// Not available without Anthropic backend.
export const fetchBootstrapData = async (): Promise<void> => {}

// ── Files API ──────────────────────────────────────────────────────
// Anthropic Files API — download/upload session file attachments.
// Requires OAuth + Anthropic backend.
export type DownloadResult = { success: boolean }
export type FilesApiConfig = Record<string, any>
export const downloadSessionFiles = async (
  ..._args: any[]
): Promise<DownloadResult[]> => []
export const parseFileSpecs = (..._args: any[]): any[] => []

// ── Direct Connect ─────────────────────────────────────────────────
// Direct connect session (WebSocket to Anthropic infra).
export class DirectConnectError extends Error {}
export const createDirectConnectSession = async (
  ..._args: any[]
): Promise<null> => null

// ── Teleport (Remote Sessions) ─────────────────────────────────────
// Teleport enables remote session branching via git + WebSocket.
// Requires Anthropic session API. All teleport code paths are gated
// by feature flags; these stubs prevent runtime errors when the code
// paths are conditionally reached.
export const fetchSession = async (_id: string): Promise<any> => null
export const prepareApiRequest = async (): Promise<{
  accessToken: string
  orgUUID: string
}> => {
  throw new Error('teleport disabled')
}
export const checkOutTeleportedSessionBranch = async (
  _branch?: string,
): Promise<{ branchError?: Error }> => ({})
export const processMessagesForTeleportResume = (
  _messages: any[],
  _error?: any,
): any[] => []
export const teleportToRemoteWithErrorHandling = async (
  _root: any,
  _desc: string,
  _signal: AbortSignal,
  _branch?: string,
): Promise<any> => null
export const validateGitState = async (): Promise<{
  valid: boolean
  error?: string
}> => ({ valid: false, error: 'teleport disabled' })
export const validateSessionRepository = async (
  _data: any,
): Promise<{
  status: 'ok' | 'mismatch' | 'not_in_repo' | 'error'
  sessionRepo?: string
  errorMessage?: string
}> => ({
  status: 'error',
  errorMessage: 'teleport disabled',
})

// ── OAuth Headers ──────────────────────────────────────────────────
// OAuth header injection for API requests.
// Fork uses API key auth only — no OAuth tokens.
export const getOAuthHeaders = (
  _t: string,
): Record<string, string> => ({})

// ── Feedback Survey ────────────────────────────────────────────────
// Anthropic in-product feedback surveys (NPS, frustration detection).
// Data goes to Anthropic analytics pipeline — not applicable here.
export const useFrustrationDetection = (..._args: any[]) => ({
  state: 'closed' as const,
  handleTranscriptSelect: () => {},
})
export const useFeedbackSurvey = (..._args: any[]) => ({
  show: false,
  dismiss: () => {},
  state: 'closed' as const,
  lastResponse: null,
  handleSelect: (_s: any) => false,
  handleTranscriptSelect: undefined,
})
export const useMemorySurvey = (..._args: any[]) => ({
  state: 'closed' as const,
  lastResponse: null,
  handleSelect: (_s: any) => {},
  handleTranscriptSelect: undefined,
})
export const usePostCompactSurvey = (..._args: any[]) => ({
  state: 'closed' as const,
  lastResponse: null,
  handleSelect: (_s: any) => {},
})
export const FeedbackSurvey = (_props: any) => null

// ── Buddy / Companion ─────────────────────────────────────────────
// Animated companion UI (sprites + floating bubble).
// Full buddy/ directory exists but UI layer is disabled.
export const CompanionSprite = () => null
export const CompanionFloatingBubble = () => null
export const MIN_COLS_FOR_FULL_SPRITE = Infinity

// ── Teleport Types ─────────────────────────────────────────────────
// Inline type stubs for removed modules.
export type SSHSession = { remoteCwd: string }
export type RemoteMessageContent = { type: string; content: string }

// ── OAuth ──────────────────────────────────────────────────────────
// This fork uses API key auth (Copilot API / third-party providers).
// OAuth login flow is unreachable — these provide type-safe fallbacks.
export type OAuthTokens = {
  access_token: string
  refresh_token: string
  expires_at?: number
  accessToken?: string
  profile?: any
  scopes?: string[]
  refreshToken?: string
  expiresAt?: number
  tokenAccount?: any
}
export const shouldUseMyCodeAIAuth = (_s?: string[]) => false
export const createAndStoreApiKey = async (_t: string) => ''
export const fetchAndStoreUserRoles = async (_t: string) => {}
export const refreshOAuthToken = async (
  _t: string,
  _o?: any,
): Promise<OAuthTokens> => ({}) as any
export const storeOAuthAccountInfo = (_o: any) => {}
export const getOauthProfileFromOauthToken = async (_t: string) => null
export class OAuthService {
  async login() {
    return null
  }
  async logout() {}
  async getToken() {
    return null
  }
  async refreshToken() {
    return null
  }
  cleanup() {}
  startOAuthFlow(..._a: any[]) {
    return Promise.resolve(null as any)
  }
}

// ── Mock Rate Limits ───────────────────────────────────────────────
// Ant-employee-only testing feature, not applicable here.
export const getMockSubscriptionType = () => undefined
export const shouldUseMockSubscription = () => false

// ── Remote Session WebSocket ───────────────────────────────────────
// Teleport remote sessions are not available in this fork.
export const sendEventToRemoteSession = async (
  _sessionId: string,
  _messageContent: RemoteMessageContent,
  _opts?: any,
): Promise<void> => {}

export type SessionsWebSocketCallbacks = {
  onMessage: (message: any) => void
  onConnected?: () => void
  onClose?: () => void
  onReconnecting?: () => void
  onError?: (error: Error) => void
}
export class SessionsWebSocket {
  constructor(
    _sessionId: string,
    _orgUuid: string,
    _getAccessToken: () => string,
    _callbacks: SessionsWebSocketCallbacks,
  ) {}
  async connect() {}
  sendControlResponse(_response: any) {}
  sendControlRequest(_request: any) {}
  isConnected() {
    return false
  }
  close() {}
  reconnect() {}
}
