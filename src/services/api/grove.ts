// Stub: grove API removed (Anthropic privacy/terms)
export type AccountSettings = Record<string, any>
export type GroveConfig = Record<string, any>
export type ApiResult<T> = { success: true; data: T } | { success: false }
export const getGroveSettings = () => Promise.resolve(null)
export async function markGroveNoticeViewed() {}
export async function updateGroveSettings() {}
export async function isQualifiedForGrove() { return false }
export const getGroveNoticeConfig = () => ({ shouldShow: false })
export function calculateShouldShowGrove() { return false }
export async function checkGroveForNonInteractive() {}
