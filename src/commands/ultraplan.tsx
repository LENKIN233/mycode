import type { Command } from '../commands.js';
import { DIAMOND_OPEN } from '../constants/figures.js';
import type { AppState } from '../state/AppStateStore.js';
import type { LocalJSXCommandCall } from '../types/command.js';
import { enqueuePendingNotification } from '../utils/messageQueueManager.js';

// Bundler inlines .txt as a string; the test runner wraps it as {default}.
/* eslint-disable @typescript-eslint/no-require-imports */
const _rawPrompt = require('../utils/ultraplan/prompt.txt');
/* eslint-enable @typescript-eslint/no-require-imports */
const DEFAULT_INSTRUCTIONS: string = (typeof _rawPrompt === 'string' ? _rawPrompt : _rawPrompt.default).trimEnd();

const ULTRAPLAN_INSTRUCTIONS: string = DEFAULT_INSTRUCTIONS;

/**
 * Assemble the ultraplan prompt that is injected into the local session.
 */
export function buildUltraplanPrompt(blurb: string, seedPlan?: string): string {
  const parts: string[] = [];
  if (seedPlan) {
    parts.push('Here is a draft plan to refine:', '', seedPlan, '');
  }
  parts.push(ULTRAPLAN_INSTRUCTIONS);
  if (blurb) {
    parts.push('', blurb);
  }
  return parts.join('\n');
}

/**
 * Stop a running ultraplan: clear local state and notify the model.
 */
export async function stopUltraplan(
  _taskId: string,
  _sessionId: string,
  setAppState: (f: (prev: AppState) => AppState) => void,
): Promise<void> {
  setAppState(prev =>
    prev.ultraplanSessionUrl || prev.ultraplanPendingChoice || prev.ultraplanLaunching
      ? {
          ...prev,
          ultraplanSessionUrl: undefined,
          ultraplanPendingChoice: undefined,
          ultraplanLaunching: undefined,
        }
      : prev,
  )
  enqueuePendingNotification({
    value: 'Ultraplan stopped.',
    mode: 'task-notification',
  })
  enqueuePendingNotification({
    value: 'The user stopped the ultraplan session above. Do not respond to the stop notification — wait for their next message.',
    mode: 'task-notification',
    isMeta: true,
  })
}

/**
 * Launch ultraplan locally: inject the plan-mode instructions into the
 * current session via a meta notification.
 */
export async function launchUltraplan(opts: {
  blurb: string
  seedPlan?: string
  getAppState: () => AppState
  setAppState: (f: (prev: AppState) => AppState) => void
  signal: AbortSignal
  disconnectedBridge?: boolean
  onSessionReady?: (msg: string) => void
}): Promise<string> {
  const { blurb, seedPlan } = opts

  if (!blurb && !seedPlan) {
    return [
      'Usage: /ultraplan \\<prompt\\>, or include "ultraplan" anywhere in your prompt',
      '',
      'Advanced plan mode: injects deep planning instructions into the current session.',
    ].join('\n')
  }

  const prompt = buildUltraplanPrompt(blurb, seedPlan)
  enqueuePendingNotification({
    value: prompt,
    mode: 'task-notification',
    isMeta: true,
  })
  return `${DIAMOND_OPEN} ultraplan\nAdvanced planning instructions injected. Claude will now produce a detailed plan.`
}

const call: LocalJSXCommandCall = async (onDone, context, args) => {
  const blurb = args.trim()
  const msg = await launchUltraplan({
    blurb,
    getAppState: context.getAppState,
    setAppState: context.setAppState,
    signal: context.abortController.signal,
  })
  onDone(msg, { display: 'system' })
  return null
}

export default {
  type: 'local-jsx',
  name: 'ultraplan',
  description: 'Advanced plan mode — injects deep planning instructions into the current session.',
  argumentHint: '<prompt>',
  isEnabled: () => true,
  load: () => Promise.resolve({ call }),
} satisfies Command
