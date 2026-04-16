import {
  checkAndRefreshOAuthTokenIfNeeded,
  isMyCodeAISubscriber,
} from '../../auth.js'
import { getCwd } from '../../cwd.js'
import { detectCurrentRepository } from '../../detectRepository.js'
import { findGitRoot, getIsClean } from '../../git.js'

/**
 * Checks if user needs to log in with MyCode.ai
 */
export async function checkNeedsMyCodeAiLogin(): Promise<boolean> {
  if (!isMyCodeAISubscriber()) {
    return false
  }
  return checkAndRefreshOAuthTokenIfNeeded()
}

/**
 * Checks if git working directory is clean (no uncommitted changes)
 */
export async function checkIsGitClean(): Promise<boolean> {
  return getIsClean({ ignoreUntracked: true })
}

/**
 * Checks if user has access to at least one remote environment.
 * Remote environment APIs (CCR/Teleport) are not available in this fork.
 */
export async function checkHasRemoteEnvironment(): Promise<boolean> {
  return false
}

/**
 * Checks if current directory is inside a git repository (has .git/).
 */
export function checkIsInGitRepo(): boolean {
  return findGitRoot(getCwd()) !== null
}

/**
 * Checks if current repository has a GitHub remote configured.
 */
export async function checkHasGitRemote(): Promise<boolean> {
  const repository = await detectCurrentRepository()
  return repository !== null
}

/**
 * Checks if GitHub app is installed on a specific repository.
 * Requires Anthropic OAuth org UUID — always returns false in this fork.
 */
export async function checkGithubAppInstalled(
  _owner: string,
  _repo: string,
  _signal?: AbortSignal,
): Promise<boolean> {
  return false
}

type RepoAccessMethod = 'github-app' | 'token-sync' | 'none'

/**
 * Tiered check for whether a GitHub repo is accessible for remote operations.
 */
export async function checkRepoForRemoteAccess(
  owner: string,
  repo: string,
): Promise<{ hasAccess: boolean; method: RepoAccessMethod }> {
  if (await checkGithubAppInstalled(owner, repo)) {
    return { hasAccess: true, method: 'github-app' }
  }
  return { hasAccess: false, method: 'none' }
}
