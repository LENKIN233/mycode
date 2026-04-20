import {
  logEvent,
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from 'src/services/analytics/index.js'
import type { AppState } from '../../state/AppState.js'
import { isBilledAsExtraUsage } from '../../utils/extraUsage.js'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'
import { isOpus1mMergeEnabled, modelDisplayString } from '../../utils/model/model.js'

type SetAppState = (updater: (prev: AppState) => AppState) => void
type SetChanges = (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void
type SetGlobalConfig = (value: ReturnType<typeof getGlobalConfig>) => void

type MainModelArgs = {
  mainLoopModel: string | null
  setAppState: SetAppState
  setChanges: SetChanges
  value: string | null
}

export function applyMainModelConfigChange({
  mainLoopModel,
  setAppState,
  setChanges,
  value,
}: MainModelArgs): void {
  logEvent('tengu_config_model_changed', {
    from_model: mainLoopModel as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    to_model: value as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  })

  setAppState(prev => ({
    ...prev,
    mainLoopModel: value,
    mainLoopModelForSession: null,
  }))

  setChanges(prev => {
    const modelLabel =
      modelDisplayString(value) +
      (isBilledAsExtraUsage(value, false, isOpus1mMergeEnabled())
        ? ' · Billed as extra usage'
        : '')

    if ('model' in prev) {
      const { model, ...rest } = prev
      return {
        ...rest,
        model: modelLabel,
      }
    }

    return {
      ...prev,
      model: modelLabel,
    }
  })
}

type VerboseArgs = {
  setAppState: SetAppState
  setChanges: SetChanges
  setGlobalConfig: SetGlobalConfig
  value: boolean
}

export function applyVerboseConfigChange({
  setAppState,
  setChanges,
  setGlobalConfig,
  value,
}: VerboseArgs): void {
  saveGlobalConfig(current => ({
    ...current,
    verbose: value,
  }))

  setGlobalConfig({
    ...getGlobalConfig(),
    verbose: value,
  })

  setAppState(prev => ({
    ...prev,
    verbose: value,
  }))

  setChanges(prev => {
    if ('verbose' in prev) {
      const { verbose, ...rest } = prev
      return rest
    }

    return {
      ...prev,
      verbose: value,
    }
  })
}
