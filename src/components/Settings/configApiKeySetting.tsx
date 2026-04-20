import React from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { Text } from '../../ink.js'
import { normalizeApiKeyForConfig } from '../../utils/authPortable.js'
import { getGlobalConfig, saveGlobalConfig, type GlobalConfig } from '../../utils/config.js'
import { isRunningOnHomespace } from 'src/utils/envUtils.js'
import type { Setting } from './types.js'

type ConfigApiKeySettingArgs = {
  globalConfig: GlobalConfig
  setGlobalConfig: Dispatch<SetStateAction<GlobalConfig>>
}

export function getConfigApiKeySetting({
  globalConfig,
  setGlobalConfig,
}: ConfigApiKeySettingArgs): Setting[] {
  const effectiveApiKey = isRunningOnHomespace() ? undefined : process.env.ANTHROPIC_API_KEY

  if (!effectiveApiKey) {
    return []
  }

  const truncatedKey = normalizeApiKeyForConfig(effectiveApiKey)

  return [
    {
      id: 'apiKey',
      label: (
        <Text>
          Use custom API key: <Text bold>{truncatedKey}</Text>
        </Text>
      ),
      searchText: 'Use custom API key',
      value: Boolean(globalConfig.customApiKeyResponses?.approved?.includes(truncatedKey)),
      type: 'boolean' as const,
      onChange(useCustomKey: boolean) {
        saveGlobalConfig(current => {
          const approved = current.customApiKeyResponses?.approved ?? []
          const rejected = current.customApiKeyResponses?.rejected ?? []

          return {
            ...current,
            customApiKeyResponses: {
              approved: useCustomKey
                ? [...approved.filter(key => key !== truncatedKey), truncatedKey]
                : approved.filter(key => key !== truncatedKey),
              rejected: useCustomKey
                ? rejected.filter(key => key !== truncatedKey)
                : [...rejected.filter(key => key !== truncatedKey), truncatedKey],
            },
          }
        })
        setGlobalConfig(getGlobalConfig())
      },
    },
  ]
}
