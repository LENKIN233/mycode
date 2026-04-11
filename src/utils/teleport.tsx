// Stub — teleport module removed (Anthropic official infrastructure)
import type { Message } from '../types/message.js'

export type TeleportResult = { messages: Message[]; branchName: string }
export type TeleportProgressStep = 'validating' | 'fetching_logs' | 'fetching_branch' | 'checking_out' | 'done'
export type TeleportProgressCallback = (step: TeleportProgressStep) => void
export type RepoValidationResult = { valid: boolean; error?: string }
export type PollRemoteSessionResponse = { events: any[]; lastId?: string }

export async function validateGitState(): Promise<RepoValidationResult> { return { valid: false, error: 'teleport disabled' } }
export function processMessagesForTeleportResume(_messages: any[], _error?: any): Message[] { return [] }
export async function checkOutTeleportedSessionBranch(_branch?: string): Promise<void> {}
export async function validateSessionRepository(_sessionData: any): Promise<RepoValidationResult> { return { valid: false, error: 'teleport disabled' } }
export async function teleportResumeCodeSession(_sessionId: string, _onProgress?: TeleportProgressCallback): Promise<TeleportResult | null> { return null }
export async function teleportToRemoteWithErrorHandling(_root: any, _description: string, _signal: AbortSignal, _branchName?: string): Promise<any> { return null }
export async function teleportFromSessionsAPI(): Promise<any> { return null }
export async function pollRemoteSessionEvents(_sessionId: string, _afterId?: string, _opts?: any): Promise<PollRemoteSessionResponse> { return { events: [] } }
export async function teleportToRemote(_options: any): Promise<any> { return null }
export async function archiveRemoteSession(_sessionId: string): Promise<void> {}
