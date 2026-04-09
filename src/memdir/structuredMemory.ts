/**
 * Structured memory categories and retrieval for enhanced agent memory.
 *
 * Extends the existing memdir system with structured category support,
 * enabling more targeted memory retrieval and better organization.
 *
 * Categories:
 * - facts:      Project facts (architecture, dependencies, conventions)
 * - preferences: User preferences (style, workflow, communication)
 * - lessons:    Lessons learned (failed approaches, gotchas, workarounds)
 * - plans:      In-progress plans and their status
 *
 * This module does NOT replace the existing MEMORY.md system — it adds
 * structured querying capabilities on top of it.
 *
 * Integration point: Used by buildMemoryPrompt in memdir.ts to provide
 * enhanced memory retrieval instructions to the agent.
 */

import { join } from 'path'
import { logEvent } from '../services/analytics/index.js'

/** Memory categories for structured organization. */
export const MEMORY_CATEGORIES = [
  'facts',
  'preferences',
  'lessons',
  'plans',
] as const

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number]

/** Category descriptions shown in the memory prompt. */
export const CATEGORY_DESCRIPTIONS: Record<MemoryCategory, string> = {
  facts:
    'Project and codebase facts — architecture decisions, dependencies, build commands, deploy targets. Things that are true about the project.',
  preferences:
    'User preferences — coding style, naming conventions, tool preferences, communication style. How the user wants to work.',
  lessons:
    'Lessons learned — failed approaches and why they failed, gotchas, workarounds, anti-patterns to avoid. What NOT to do.',
  plans:
    'Active plans — ongoing tasks, next steps, blocked items. What we are working on and what comes next.',
}

/** Category-specific guidance for what to store. */
export const CATEGORY_GUIDANCE: Record<MemoryCategory, string[]> = {
  facts: [
    'Store architecture decisions and their rationale',
    'Record build/test/deploy commands that differ from defaults',
    'Note dependency version constraints or compatibility issues',
    'Track external service integrations and their configs',
  ],
  preferences: [
    'Record explicit user requests about coding style',
    'Note communication preferences (verbosity, language, format)',
    'Track tool and workflow preferences (e.g., "use bun not npm")',
    'Save personal context that affects how to assist',
  ],
  lessons: [
    'Record failed approaches with WHY they failed',
    'Note error patterns that need specific handling',
    'Track workarounds for known issues',
    'Save debugging insights that took significant effort to discover',
  ],
  plans: [
    'Record the current task and its sub-steps',
    'Track which steps are done vs. pending',
    'Note blocked items and what they depend on',
    'Update plans when the approach changes',
  ],
}

/**
 * Build the enhanced memory organization prompt section.
 * Appended to the existing memory prompt to guide the agent toward
 * structured memory organization.
 */
export function buildStructuredMemoryGuidance(memoryDir: string): string[] {
  const lines: string[] = [
    '## Structured memory organization',
    '',
    'Organize memories into these categories using frontmatter `type` field:',
    '',
  ]

  for (const category of MEMORY_CATEGORIES) {
    lines.push(`### ${category}`)
    lines.push(CATEGORY_DESCRIPTIONS[category])
    lines.push('')
    for (const guidance of CATEGORY_GUIDANCE[category]) {
      lines.push(`- ${guidance}`)
    }
    lines.push('')
  }

  lines.push(
    '### Category selection rules',
    '',
    '- If a memory is about how the project works → `facts`',
    '- If a memory is about how the user prefers things → `preferences`',
    '- If a memory is about what went wrong or should be avoided → `lessons`',
    '- If a memory is about current/future work → `plans`',
    '- When in doubt, use `facts` — it is the most general category',
    '',
  )

  return lines
}

/**
 * Score the relevance of a memory entry to a given query.
 * Simple keyword-based scoring — no embeddings needed.
 *
 * @param memoryContent - The full text of the memory entry
 * @param query - The current user query or task context
 * @returns Relevance score from 0 to 1
 */
export function scoreMemoryRelevance(
  memoryContent: string,
  query: string,
): number {
  if (!query || !memoryContent) return 0

  const queryWords = tokenize(query)
  const memoryWords = new Set(tokenize(memoryContent))

  if (queryWords.length === 0 || memoryWords.size === 0) return 0

  // Count matching words
  let matches = 0
  for (const word of queryWords) {
    if (memoryWords.has(word)) matches++
  }

  // Normalize by query length
  return matches / queryWords.length
}

/**
 * Simple tokenizer that splits text into lowercase words.
 * Filters out common stop words for better relevance scoring.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'are',
  'but',
  'not',
  'you',
  'all',
  'can',
  'had',
  'her',
  'was',
  'one',
  'our',
  'out',
  'has',
  'have',
  'been',
  'some',
  'then',
  'than',
  'them',
  'this',
  'that',
  'with',
  'will',
  'each',
  'from',
  'they',
  'more',
  'what',
  'when',
  'where',
  'which',
  'their',
  'would',
  'there',
  'could',
  'other',
  'into',
  'just',
  'about',
  'these',
  'should',
])
