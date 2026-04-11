import axios from 'axios'
import { getOauthConfig } from '../../constants/oauth.js'
import { isMyCodeAISubscriber } from '../../utils/auth.js'
import { logForDebugging } from '../../utils/debug.js'
// Teleport API removed — inlined no-ops
const getOAuthHeaders = (_t: string): Record<string, string> => ({})
const prepareApiRequest = async (): Promise<{ baseUrl: string; headers: Record<string, string> }> => { throw new Error('teleport disabled') }

export type UltrareviewQuotaResponse = {
  reviews_used: number
  reviews_limit: number
  reviews_remaining: number
  is_overage: boolean
}

/**
 * Peek the ultrareview quota for display and nudge decisions. Consume
 * happens server-side at session creation. Null when not a subscriber or
 * the endpoint errors.
 */
export async function fetchUltrareviewQuota(): Promise<UltrareviewQuotaResponse | null> {
  if (!isMyCodeAISubscriber()) return null
  try {
    const { accessToken, orgUUID } = await prepareApiRequest()
    const response = await axios.get<UltrareviewQuotaResponse>(
      `${getOauthConfig().BASE_API_URL}/v1/ultrareview/quota`,
      {
        headers: {
          ...getOAuthHeaders(accessToken),
          'x-organization-uuid': orgUUID,
        },
        timeout: 5000,
      },
    )
    return response.data
  } catch (error) {
    logForDebugging(`fetchUltrareviewQuota failed: ${error}`)
    return null
  }
}
