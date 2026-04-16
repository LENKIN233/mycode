/**
 * Grove API — removed from this build.
 * Grove was an Anthropic-internal feature for consumer subscribers.
 * All functions are no-ops.
 */

/**
 * Returns false — Grove eligibility check is always false in this build.
 */
export const isQualifiedForGrove = async (): Promise<boolean> => false

/**
 * No-op — Grove requirements check for non-interactive mode is skipped.
 */
export async function checkGroveForNonInteractive(): Promise<void> {
  // Grove API removed
}
