import type React from 'react'

export type BasicConfigSubMenu = 'Theme' | 'Model' | 'OutputStyle' | 'Language'
export type ProviderRoutingSubMenu = 'Provider' | 'TaskRouting'
export type ConfigSpecialSubMenu =
  | 'TeammateModel'
  | 'ExternalIncludes'
  | 'EnableAutoUpdates'
  | 'ChannelDowngrade'
export type ConfigSubMenu =
  | BasicConfigSubMenu
  | ProviderRoutingSubMenu
  | ConfigSpecialSubMenu

export type AutoUpdateChannel = 'latest' | 'stable'

export type SettingBase =
  | {
      id: string
      label: string
    }
  | {
      id: string
      label: React.ReactNode
      searchText: string
    }

export type Setting =
  | (SettingBase & {
      value: boolean
      onChange(value: boolean): void
      type: 'boolean'
    })
  | (SettingBase & {
      value: string
      options: string[]
      onChange(value: string): void
      type: 'enum'
    })
  | (SettingBase & {
      value: string
      onChange(value: string): void
      type: 'managedEnum'
    })
