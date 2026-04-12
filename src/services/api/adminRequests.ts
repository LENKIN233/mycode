export type AdminRequestType = 'limit_increase' | 'seat_upgrade'

export type AdminRequestStatus = 'pending' | 'approved' | 'dismissed'

export type AdminRequestSeatUpgradeDetails = {
  message?: string | null
  current_seat_tier?: string | null
}

export type AdminRequestCreateParams =
  | {
      request_type: 'limit_increase'
      details: null
    }
  | {
      request_type: 'seat_upgrade'
      details: AdminRequestSeatUpgradeDetails
    }

export type AdminRequest = {
  uuid: string
  status: AdminRequestStatus
  requester_uuid?: string | null
  created_at: string
} & (
  | {
      request_type: 'limit_increase'
      details: null
    }
  | {
      request_type: 'seat_upgrade'
      details: AdminRequestSeatUpgradeDetails
    }
)

/**
 * Create an admin request (limit increase or seat upgrade).
 * Anthropic platform API not available in this fork.
 */
export async function createAdminRequest(
  _params: AdminRequestCreateParams,
): Promise<AdminRequest | null> {
  return null
}

/**
 * Get pending admin request of a specific type for the current user.
 * Anthropic platform API not available in this fork.
 */
export async function getMyAdminRequests(
  _requestType: AdminRequestType,
  _statuses: AdminRequestStatus[],
): Promise<AdminRequest[] | null> {
  return null
}

type AdminRequestEligibilityResponse = {
  request_type: AdminRequestType
  is_allowed: boolean
}

/**
 * Check if a specific admin request type is allowed for this org.
 * Anthropic platform API not available in this fork.
 */
export async function checkAdminRequestEligibility(
  _requestType: AdminRequestType,
): Promise<AdminRequestEligibilityResponse | null> {
  return null
}
