// Stub — computer use removed (requires Anthropic computer-use infrastructure)
export const COMPUTER_USE_MCP_SERVER_NAME = 'computer-use'
export const CLI_HOST_BUNDLE_ID = 'com.mycode.cli-no-window'
export const CLI_CU_CAPABILITIES = { screenshot: false, mouse: false, keyboard: false }
export function getTerminalBundleId(): string | null { return null }
export function isComputerUseMCPServer(_name: string): boolean { return false }
