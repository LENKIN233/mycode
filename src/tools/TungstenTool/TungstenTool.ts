import { buildTool } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { z } from 'zod/v4'

const tungstenInputSchema = lazySchema(() => z.object({}).passthrough())

export const TungstenTool = buildTool({
  name: 'tungsten',
  userFacingName() {
    return 'Tungsten'
  },
  async description() {
    return (
      'Internal terminal-session bridge used by MyCode builds. ' +
      'This restored workspace keeps the tool registered so configs and ' +
      'older transcripts remain readable, but the original backend is absent.'
    )
  },
  async prompt() {
    return (
      'Tungsten is not executable in this restored workspace. ' +
      'If the user needs terminal automation, use the standard Bash tool ' +
      'or another available local tool instead.'
    )
  },
  inputSchema: tungstenInputSchema(),
  outputSchema: {
    parse(value: unknown) {
      return value
    },
  } as never,
  isEnabled() {
    return false
  },
  isReadOnly() {
    return true
  },
  isConcurrencySafe() {
    return true
  },
  async call() {
    return {
      data: {
        ok: false,
        error:
          'Tungsten is unavailable in this restored workspace; use Bash or another local tool instead.',
      },
    }
  },
})
