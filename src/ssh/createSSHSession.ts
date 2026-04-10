export type SSHSession = {
  remoteCwd: string
} & Record<string, unknown>

export class SSHSessionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SSHSessionError'
  }
}

export async function createSSHSession(
  _config?: Record<string, unknown>,
  _options?: Record<string, unknown>,
): Promise<SSHSession> {
  return { remoteCwd: process.cwd() }
}

export function createLocalSSHSession(
  _config?: Record<string, unknown>,
): SSHSession {
  return { remoteCwd: process.cwd() }
}
