import { formatUsageSummary } from '../../usage-tracker.js'
import type { LocalCommandCall } from '../../types/command.js'
import { getMainLoopModel } from '../../utils/model/model.js'
import {
  TASK_CATEGORIES,
  TASK_CATEGORY_KEYS,
  getModelForTask,
} from '../../utils/model/taskModels.js'

export const call: LocalCommandCall = async () => {
  const mainModel = getMainLoopModel()
  const taskModels = TASK_CATEGORY_KEYS
    .map(key => `  ${key} (${TASK_CATEGORIES[key].label}): ${getModelForTask(key)}`)
    .join('\n')

  const value =
    `${formatUsageSummary()}\n\n` +
    `Model config:\n` +
    `  main_loop (active): ${mainModel}\n` +
    `${taskModels}\n\n` +
    `Request counting:\n` +
    `  Copilot provider: billed request units (e.g. opus ~= 3, free GPT models = 0)\n` +
    `  Other providers: 1 request = one outbound beta.messages.create call\n` +
    `  Includes: streaming calls, non-streaming fallback calls, retries, side queries\n` +
    `  Excludes: local tool execution without an API call`

  return { type: 'text', value }
}
