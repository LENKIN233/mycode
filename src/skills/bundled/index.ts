import { feature } from 'bun:bundle'
import { shouldAutoEnableMyCodeInChrome } from 'src/utils/mycodeInChrome/setup.js'
import { registerBatchSkill } from './batch.js'
import { registerMyCodeInChromeSkill } from './mycodeInChrome.js'
import { registerDebugSkill } from './debug.js'
import { registerKeybindingsSkill } from './keybindings.js'
import { registerLoremIpsumSkill } from './loremIpsum.js'
import { registerRememberSkill } from './remember.js'
import { registerSimplifySkill } from './simplify.js'
import { registerSkillifySkill } from './skillify.js'
import { registerStuckSkill } from './stuck.js'
import { registerUpdateConfigSkill } from './updateConfig.js'
import { registerVerifySkill } from './verify.js'

/**
 * Initialize all bundled skills.
 * Called at startup to register skills that ship with the CLI.
 *
 * To add a new bundled skill:
 * 1. Create a new file in src/skills/bundled/ (e.g., myskill.ts)
 * 2. Export a register function that calls registerBundledSkill()
 * 3. Import and call that function here
 */
export function initBundledSkills(): void {
  registerUpdateConfigSkill()
  registerKeybindingsSkill()
  registerVerifySkill()
  registerDebugSkill()
  registerLoremIpsumSkill()
  registerSkillifySkill()
  registerRememberSkill()
  registerSimplifySkill()
  registerBatchSkill()
  registerStuckSkill()
  if (feature('KAIROS') || feature('KAIROS_DREAM')) {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { registerDreamSkill } = require('./dream.js')
    /* eslint-enable @typescript-eslint/no-require-imports */
    registerDreamSkill()
  }
  if (feature('REVIEW_ARTIFACT')) {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { registerHunterSkill } = require('./hunter.js')
    /* eslint-enable @typescript-eslint/no-require-imports */
    registerHunterSkill()
  }

  if (feature('BUILDING_MYCODE_APPS')) {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { registerMyCodeApiSkill } = require('./mycodeApi.js')
    /* eslint-enable @typescript-eslint/no-require-imports */
    registerMyCodeApiSkill()
  }
  if (shouldAutoEnableMyCodeInChrome()) {
    registerMyCodeInChromeSkill()
  }
  if (feature('RUN_SKILL_GENERATOR')) {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { registerRunSkillGeneratorSkill } = require('./runSkillGenerator.js')
    /* eslint-enable @typescript-eslint/no-require-imports */
    registerRunSkillGeneratorSkill()
  }
}
