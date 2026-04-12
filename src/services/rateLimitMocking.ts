/**
 * Facade for rate limit header processing.
 * Mock rate limits (/mock-limits command) are an Ant-employee-only testing
 * feature and are not available in this fork. All functions here pass through
 * or return inert values.
 */

import { APIError } from '@anthropic-ai/sdk'

export function processRateLimitHeaders(
  headers: globalThis.Headers,
): globalThis.Headers {
  return headers
}

export function shouldProcessRateLimits(isSubscriber: boolean): boolean {
  return isSubscriber
}

export function checkMockRateLimitError(
  _currentModel: string,
  _isFastModeActive?: boolean,
): APIError | null {
  return null
}

export function isMockRateLimitError(_error: APIError): boolean {
  return false
}

const shouldProcessMockLimits = () => false
export { shouldProcessMockLimits }
