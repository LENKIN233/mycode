import type { ContentBlockParam } from '@ai/sdk/resources/index.mjs'
import {
  ListResourcesResultSchema,
  ReadResourceResultSchema,
  type ReadResourceResult,
  type Resource,
} from '@modelcontextprotocol/sdk/types.js'
import type { Command } from '../commands.js'
import { errorMessage } from '../utils/errors.js'
import { logMCPError } from '../utils/log.js'
import { memoizeWithLRU } from '../utils/memoize.js'
import { normalizeNameForMCP } from '../services/mcp/normalization.js'
import type { MCPServerConnection } from '../services/mcp/types.js'

const MCP_SKILL_FETCH_CACHE_SIZE = 100

function isSkillResource(resource: Resource): boolean {
  return resource.uri.startsWith('skill://')
}

function toSkillIdentifier(resource: Resource): string {
  const raw =
    resource.name ??
    resource.uri.replace(/^skill:\/\//, '').split(/[/?#]/, 1)[0] ??
    'skill'

  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'skill'
}

async function readSkillResource(
  client: MCPServerConnection,
  uri: string,
): Promise<ContentBlockParam[]> {
  if (client.type !== 'connected') return []

  const result = (await client.client.request(
    {
      method: 'resources/read',
      params: { uri },
    },
    ReadResourceResultSchema,
  )) as ReadResourceResult

  const content: ContentBlockParam[] = []

  for (const resource of result.contents) {
    if ('text' in resource && typeof resource.text === 'string') {
      content.push({
        type: 'text',
        text: resource.text,
      })
      continue
    }

    if ('blob' in resource) {
      content.push({
        type: 'text',
        text: `[Binary MCP skill resource omitted: ${resource.uri}${resource.mimeType ? ` (${resource.mimeType})` : ''}]`,
      })
    }
  }

  if (content.length === 0) {
    content.push({
      type: 'text',
      text: `[Empty MCP skill resource: ${uri}]`,
    })
  }

  return content
}

export const fetchMcpSkillsForClient = memoizeWithLRU(
  async (client: MCPServerConnection): Promise<Command[]> => {
    if (client.type !== 'connected' || !client.capabilities?.resources) {
      return []
    }

    try {
      const result = await client.client.request(
        { method: 'resources/list' },
        ListResourcesResultSchema,
      )

      const resources = (result.resources ?? []).filter(isSkillResource)
      const seen = new Set<string>()

      return resources.flatMap(resource => {
        const skillId = toSkillIdentifier(resource)
        const commandName = `${normalizeNameForMCP(client.name)}:${skillId}`
        if (seen.has(commandName)) return []
        seen.add(commandName)

        const description =
          resource.description ??
          resource.name ??
          `MCP skill from ${client.name}`

        return [
          {
            type: 'prompt' as const,
            name: commandName,
            description,
            hasUserSpecifiedDescription: !!resource.description,
            contentLength: 0,
            isEnabled: () => true,
            isHidden: false,
            progressMessage: 'loading skill',
            source: 'mcp',
            loadedFrom: 'mcp' as const,
            whenToUse: resource.description,
            userFacingName() {
              return `${client.name}:${resource.name ?? skillId}`
            },
            async getPromptForCommand() {
              return readSkillResource(client, resource.uri)
            },
          },
        ]
      })
    } catch (error) {
      logMCPError(
        client.name,
        `Failed to fetch MCP skills: ${errorMessage(error)}`,
      )
      return []
    }
  },
  (client: MCPServerConnection) => client.name,
  MCP_SKILL_FETCH_CACHE_SIZE,
)
