function readAssistantModeFlag(): boolean {
  return (
    process.env.MYCODE_ASSISTANT_MODE === '1' ||
    process.env.MYCODE_ASSISTANT_MODE === 'true'
  )
}

export function isAssistantMode(): boolean {
  return readAssistantModeFlag()
}

export function isAssistantModeEnabled(): boolean {
  return readAssistantModeFlag()
}

let assistantForced = false

export function markAssistantForced(): void {
  assistantForced = true
}

export function isAssistantForced(): boolean {
  return assistantForced
}

export async function initializeAssistantTeam(): Promise<{
  teamName: string
  teamFilePath: string
  leadAgentId: string
  teammates: {
    [teammateId: string]: {
      name: string
      agentType?: string
      color?: string
      tmuxSessionName: string
      tmuxPaneId: string
      cwd: string
      worktreePath?: string
      spawnedAt: number
    }
  }
}> {
  return {
    teamName: 'assistant',
    teamFilePath: '',
    leadAgentId: 'assistant',
    teammates: {},
  }
}

export function getAssistantSystemPromptAddendum(): string {
  return ''
}

export function getAssistantActivationPath(): string {
  return 'assistant'
}
