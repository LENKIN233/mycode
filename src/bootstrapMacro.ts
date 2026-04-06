import pkg from '../package.json'

type MacroConfig = {
  VERSION: string
  BUILD_TIME: string
  PACKAGE_URL: string
  NATIVE_PACKAGE_URL: string
  VERSION_CHANGELOG: string
  ISSUES_EXPLAINER: string
  FEEDBACK_CHANNEL: string
}

const defaultMacro: MacroConfig = {
  VERSION: pkg.version,
  BUILD_TIME: '',
  PACKAGE_URL: pkg.name,
  NATIVE_PACKAGE_URL: pkg.name,
  VERSION_CHANGELOG: '',
  ISSUES_EXPLAINER:
    'file an issue at https://github.com/LENKIN233/mycode/issues',
  FEEDBACK_CHANNEL: 'github',
}

export function ensureBootstrapMacro(): void {
  // Unlock ant-only enhanced prompts (better code style guidance, length
  // anchors, accuracy constraints). Safe for personal use — gated features
  // that require Anthropic infra still check additional conditions.
  if (!process.env.USER_TYPE) {
    process.env.USER_TYPE = 'ant'
  }

  if (!('MACRO' in globalThis)) {
    ;(globalThis as typeof globalThis & { MACRO: MacroConfig }).MACRO =
      defaultMacro
  }
}
