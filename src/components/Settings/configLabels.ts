import { modelDisplayString } from '../../utils/model/model.js'
import { getHardcodedTeammateModelFallback } from '../../utils/swarm/teammateModel.js'

export function teammateModelDisplayString(value: string | null | undefined): string {
  if (value === undefined) {
    return modelDisplayString(getHardcodedTeammateModelFallback())
  }
  if (value === null) {
    return "Default (leader's model)"
  }
  return modelDisplayString(value)
}
