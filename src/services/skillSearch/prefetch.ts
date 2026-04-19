import { getProjectRoot } from '../../bootstrap/state.js'
import type { ToolUseContext } from '../../Tool.js'
import { SKILL_TOOL_NAME } from '../../tools/SkillTool/constants.js'
import type { Message } from '../../types/message.js'
import type { Attachment } from '../../utils/attachments.js'
import { getUserMessageText } from '../../utils/messages.js'
import { toolMatchesName } from '../../Tool.js'
import { isSkillSearchEnabled } from './featureCheck.js'
import { localSkillSearch } from './localSearch.js'
import {
  createSkillSearchSignal,
  type DiscoverySignal,
} from './signals.js'

const SKILL_DISCOVERY_LIMIT = 5
const DISCOVERY_VERB_RE =
  /\b(add|analy[sz]e|build|change|clean|debug|document|edit|fix|grep|implement|improve|investigate|migrate|optimi[sz]e|refactor|rename|review|search|test|update|write)\b/i

type PendingSkillDiscoveryPrefetch = {
  promise: Promise<Attachment[]>
  settledAt: number | null
}

function shouldRunDiscovery(query: string): boolean {
  const trimmed = query.trim()
  if (trimmed.length < 12) return false
  if (trimmed.startsWith('/') || trimmed.startsWith('!')) return false
  return DISCOVERY_VERB_RE.test(trimmed) || trimmed.length >= 40
}

function getLastUserText(messages: Message[]): string | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const text = getUserMessageText(messages[i]!)
    if (text && text.trim().length > 0) {
      return text
    }
  }
  return null
}

function getAlreadySurfacedSkillNames(messages: Message[]): Set<string> {
  const names = new Set<string>()
  for (const message of messages) {
    if (message.type !== 'attachment') continue
    const attachment = message.attachment
    if (attachment.type === 'skill_discovery') {
      for (const skill of attachment.skills) {
        names.add(skill.name)
      }
      continue
    }
    if (attachment.type === 'skill_listing') {
      const matches = attachment.content.matchAll(/\/([a-z0-9:_-]+)/gi)
      for (const match of matches) {
        if (match[1]) names.add(match[1])
      }
    }
  }
  return names
}

async function buildSkillDiscoveryAttachment(
  query: string,
  messages: Message[],
  toolUseContext: ToolUseContext,
  signal: DiscoverySignal,
): Promise<Attachment[]> {
  if (!isSkillSearchEnabled()) return []
  if (
    !toolUseContext.options.tools.some(t => toolMatchesName(t, SKILL_TOOL_NAME))
  ) {
    return []
  }
  if (!shouldRunDiscovery(query)) return []

  const existingNames = getAlreadySurfacedSkillNames(messages)
  const commands = await localSkillSearch({
    query,
    cwd: getProjectRoot(),
    mcpCommands: toolUseContext.getAppState().mcp.commands,
    limit: SKILL_DISCOVERY_LIMIT,
    excludeNames: existingNames,
  })

  if (commands.length === 0) return []

  for (const command of commands) {
    toolUseContext.discoveredSkillNames?.add(command.name)
  }

  return [
    {
      type: 'skill_discovery',
      skills: commands.map(command => ({
        name: command.name,
        description: command.description,
      })),
      signal,
      source: 'native',
    },
  ]
}

export async function getTurnZeroSkillDiscovery(
  input: string,
  messages: Message[],
  toolUseContext: ToolUseContext,
): Promise<Attachment[]> {
  return buildSkillDiscoveryAttachment(
    input,
    messages,
    toolUseContext,
    createSkillSearchSignal({ type: 'turn_zero' }),
  )
}

export function startSkillDiscoveryPrefetch(
  _signal: unknown,
  messages: Message[],
  toolUseContext: ToolUseContext,
): PendingSkillDiscoveryPrefetch | null {
  if (!isSkillSearchEnabled()) return null

  const query = getLastUserText(messages)
  if (!query || !shouldRunDiscovery(query)) return null

  const pending: PendingSkillDiscoveryPrefetch = {
    settledAt: null,
    promise: Promise.resolve().then(async () =>
      buildSkillDiscoveryAttachment(
        query,
        messages,
        toolUseContext,
        createSkillSearchSignal({
          type: toolUseContext.agentId ? 'subagent_spawn' : 'assistant_turn',
          hidden_by_main_turn: false,
        }),
      ),
    ),
  }

  void pending.promise.finally(() => {
    pending.settledAt = Date.now()
  })

  return pending
}

export async function collectSkillDiscoveryPrefetch(
  pending: PendingSkillDiscoveryPrefetch,
): Promise<Attachment[]> {
  const attachments = await pending.promise
  if (pending.settledAt === null) {
    return attachments
  }

  return attachments.map(attachment =>
    attachment.type === 'skill_discovery' &&
    attachment.signal.type !== 'turn_zero'
      ? {
          ...attachment,
          signal: {
            ...attachment.signal,
            hidden_by_main_turn: true,
          },
        }
      : attachment,
  )
}
