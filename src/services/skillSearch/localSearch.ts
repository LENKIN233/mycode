import memoize from 'lodash-es/memoize.js'
import uniqBy from 'lodash-es/uniqBy.js'
import { getProjectRoot } from '../../bootstrap/state.js'
import {
  getCommands,
  getMcpSkillCommands,
} from '../../commands.js'
import type { Command } from '../../types/command.js'
import { getSkillUsageScore } from '../../utils/suggestions/skillUsageTracking.js'

type LocalSkillSearchParams = {
  query: string
  cwd?: string
  mcpCommands?: readonly Command[]
  limit?: number
  excludeNames?: Iterable<string>
  includeBundledAndMcp?: boolean
}

type SearchableSkill = {
  command: Command
  haystack: string
  nameLower: string
}

const getLocalSkillIndex = memoize(async (cwd: string): Promise<SearchableSkill[]> =>
  buildSearchableSkills(
    (await getCommands(cwd)).filter(
      command => command.type === 'prompt' && !command.disableModelInvocation,
    ),
  ),
)

function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function buildSearchableSkills(commands: readonly Command[]): SearchableSkill[] {
  return uniqBy(commands, 'name').map(command => {
    const haystack = normalizeSearchText(
      [
        command.name,
        command.description,
        command.whenToUse,
        ...(command.aliases ?? []),
      ]
        .filter(Boolean)
        .join(' '),
    )

    return {
      command,
      haystack,
      nameLower: command.name.toLowerCase(),
    }
  })
}

function scoreSkill(candidate: SearchableSkill, query: string): number {
  if (query.length === 0) return 0

  const tokens = query.split(/\s+/).filter(Boolean)
  let score = getSkillUsageScore(candidate.command.name)
  let matched = false

  if (candidate.nameLower === query) {
    score += 200
    matched = true
  }
  if (candidate.nameLower.startsWith(query)) {
    score += 80
    matched = true
  }
  if (candidate.haystack.includes(query)) {
    score += 40
    matched = true
  }

  for (const token of tokens) {
    if (token.length < 2) continue
    if (candidate.nameLower === token) {
      score += 60
      matched = true
    } else if (candidate.nameLower.startsWith(token)) {
      score += 24
      matched = true
    } else if (candidate.nameLower.includes(token)) {
      score += 12
      matched = true
    }

    if (candidate.haystack.includes(token)) {
      score += 6
      matched = true
    }
  }

  if (
    matched &&
    candidate.command.loadedFrom !== 'bundled' &&
    candidate.command.loadedFrom !== 'mcp'
  ) {
    score += 8
  }

  return matched ? score : 0
}

export async function localSkillSearch({
  query,
  cwd = getProjectRoot(),
  mcpCommands = [],
  limit = 5,
  excludeNames = [],
  includeBundledAndMcp = false,
}: LocalSkillSearchParams): Promise<Command[]> {
  const normalizedQuery = normalizeSearchText(query).slice(0, 300)
  if (normalizedQuery.length === 0) {
    return []
  }

  const exclude = new Set(excludeNames)
  let localIndex: SearchableSkill[]
  try {
    localIndex = await getLocalSkillIndex(cwd)
  } catch {
    return []
  }
  const mcpIndex = buildSearchableSkills(getMcpSkillCommands(mcpCommands))
  const ranked = uniqBy([...localIndex, ...mcpIndex], item => item.command.name)
    .filter(item => !exclude.has(item.command.name))
    .filter(
      item =>
        includeBundledAndMcp ||
        (item.command.loadedFrom !== 'bundled' && item.command.loadedFrom !== 'mcp'),
    )
    .map(item => ({
      command: item.command,
      score: scoreSkill(item, normalizedQuery),
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)

  return ranked.slice(0, limit).map(item => item.command)
}

export function clearSkillIndexCache() {
  getLocalSkillIndex.cache?.clear?.()
}
