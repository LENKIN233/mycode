import React from 'react'
import type { OutputStyle } from '../../utils/config.js'
import { Box, Text } from '../../ink.js'
import type { ThemeSetting } from '../../utils/theme.js'
import { ThemePicker } from '../ThemePicker.js'
import { ModelPicker } from '../ModelPicker.js'
import { OutputStylePicker } from '../OutputStylePicker.js'
import { LanguagePicker } from '../LanguagePicker.js'
import { KeyboardShortcutHint } from '../design-system/KeyboardShortcutHint.js'
import { ConfigurableShortcutHint } from '../ConfigurableShortcutHint.js'
import { Byline } from '../design-system/Byline.js'

export type BasicConfigSubMenu = 'Theme' | 'Model' | 'OutputStyle' | 'Language'

export function isBasicConfigSubMenu(value: string | null): value is BasicConfigSubMenu {
  return (
    value === 'Theme' ||
    value === 'Model' ||
    value === 'OutputStyle' ||
    value === 'Language'
  )
}

function renderFooter(
  action: 'confirm' | 'select',
  cancelContext: 'Confirmation' | 'Settings',
  cancelDescription: string,
  italic = false,
): React.ReactNode {
  const content = (
    <Text dimColor={true} italic={italic}>
      <Byline>
        <KeyboardShortcutHint shortcut="Enter" action={action} />
        <ConfigurableShortcutHint
          action="confirm:no"
          context={cancelContext}
          fallback="Esc"
          description={cancelDescription}
        />
      </Byline>
    </Text>
  )

  if (italic) {
    return <Box>{content}</Box>
  }

  return content
}

type RenderBasicConfigSubMenuProps = {
  submenu: BasicConfigSubMenu
  mainLoopModel: string | null
  currentOutputStyle: OutputStyle
  currentLanguage: string | undefined
  showFastModeNotice: boolean
  onThemeSelected: (theme: ThemeSetting) => void
  onModelSelected: (model: string | null) => void
  onOutputStyleSelected: (style: OutputStyle | undefined) => void
  onLanguageSelected: (language: string | undefined) => void
  onClose: () => void
}

export function renderBasicConfigSubMenu({
  submenu,
  mainLoopModel,
  currentOutputStyle,
  currentLanguage,
  showFastModeNotice,
  onThemeSelected,
  onModelSelected,
  onOutputStyleSelected,
  onLanguageSelected,
  onClose,
}: RenderBasicConfigSubMenuProps): React.ReactNode {
  switch (submenu) {
    case 'Theme':
      return (
        <>
          <ThemePicker
            onThemeSelect={onThemeSelected}
            onCancel={onClose}
            hideEscToCancel
            skipExitHandling={true}
          />
          {renderFooter('select', 'Confirmation', 'cancel', true)}
        </>
      )
    case 'Model':
      return (
        <>
          <ModelPicker
            initial={mainLoopModel}
            onSelect={(model, _effort) => onModelSelected(model)}
            onCancel={onClose}
            showFastModeNotice={showFastModeNotice}
          />
          {renderFooter('confirm', 'Confirmation', 'cancel')}
        </>
      )
    case 'OutputStyle':
      return (
        <>
          <OutputStylePicker
            initialStyle={currentOutputStyle}
            onComplete={onOutputStyleSelected}
            onCancel={onClose}
          />
          {renderFooter('confirm', 'Confirmation', 'cancel')}
        </>
      )
    case 'Language':
      return (
        <>
          <LanguagePicker
            initialLanguage={currentLanguage}
            onComplete={onLanguageSelected}
            onCancel={onClose}
          />
          {renderFooter('confirm', 'Settings', 'cancel')}
        </>
      )
  }
}
