// Stub: SSH session feature removed
export interface SSHSession { remoteCwd: string }
export function createSSHSession() { return { remoteCwd: process.cwd() } }
