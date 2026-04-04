// Content for the mycode-api bundled skill.
// Each .md file is inlined as a string at build time via Bun's text loader.

import csharpMyCodeApi from './mycode-api/csharp/mycode-api.md'
import curlExamples from './mycode-api/curl/examples.md'
import goMyCodeApi from './mycode-api/go/mycode-api.md'
import javaMyCodeApi from './mycode-api/java/mycode-api.md'
import phpMyCodeApi from './mycode-api/php/mycode-api.md'
import pythonAgentSdkPatterns from './mycode-api/python/agent-sdk/patterns.md'
import pythonAgentSdkReadme from './mycode-api/python/agent-sdk/README.md'
import pythonMyCodeApiBatches from './mycode-api/python/mycode-api/batches.md'
import pythonMyCodeApiFilesApi from './mycode-api/python/mycode-api/files-api.md'
import pythonMyCodeApiReadme from './mycode-api/python/mycode-api/README.md'
import pythonMyCodeApiStreaming from './mycode-api/python/mycode-api/streaming.md'
import pythonMyCodeApiToolUse from './mycode-api/python/mycode-api/tool-use.md'
import rubyMyCodeApi from './mycode-api/ruby/mycode-api.md'
import skillPrompt from './mycode-api/SKILL.md'
import sharedErrorCodes from './mycode-api/shared/error-codes.md'
import sharedLiveSources from './mycode-api/shared/live-sources.md'
import sharedModels from './mycode-api/shared/models.md'
import sharedPromptCaching from './mycode-api/shared/prompt-caching.md'
import sharedToolUseConcepts from './mycode-api/shared/tool-use-concepts.md'
import typescriptAgentSdkPatterns from './mycode-api/typescript/agent-sdk/patterns.md'
import typescriptAgentSdkReadme from './mycode-api/typescript/agent-sdk/README.md'
import typescriptMyCodeApiBatches from './mycode-api/typescript/mycode-api/batches.md'
import typescriptMyCodeApiFilesApi from './mycode-api/typescript/mycode-api/files-api.md'
import typescriptMyCodeApiReadme from './mycode-api/typescript/mycode-api/README.md'
import typescriptMyCodeApiStreaming from './mycode-api/typescript/mycode-api/streaming.md'
import typescriptMyCodeApiToolUse from './mycode-api/typescript/mycode-api/tool-use.md'

// @[MODEL LAUNCH]: Update the model IDs/names below. These are substituted into {{VAR}}
// placeholders in the .md files at runtime before the skill prompt is sent.
// After updating these constants, manually update the two files that still hardcode models:
//   - mycode-api/SKILL.md (Current Models pricing table)
//   - mycode-api/shared/models.md (full model catalog with legacy versions and alias mappings)
export const SKILL_MODEL_VARS = {
  OPUS_ID: 'claude-opus-4-6',
  OPUS_NAME: 'MyCode Opus 4.6',
  SONNET_ID: 'claude-sonnet-4-6',
  SONNET_NAME: 'MyCode Sonnet 4.6',
  HAIKU_ID: 'claude-haiku-4-5',
  HAIKU_NAME: 'MyCode Haiku 4.5',
  // Previous Sonnet ID — used in "do not append date suffixes" example in SKILL.md.
  PREV_SONNET_ID: 'claude-sonnet-4-5',
} satisfies Record<string, string>

export const SKILL_PROMPT: string = skillPrompt

export const SKILL_FILES: Record<string, string> = {
  'csharp/mycode-api.md': csharpMyCodeApi,
  'curl/examples.md': curlExamples,
  'go/mycode-api.md': goMyCodeApi,
  'java/mycode-api.md': javaMyCodeApi,
  'php/mycode-api.md': phpMyCodeApi,
  'python/agent-sdk/README.md': pythonAgentSdkReadme,
  'python/agent-sdk/patterns.md': pythonAgentSdkPatterns,
  'python/mycode-api/README.md': pythonMyCodeApiReadme,
  'python/mycode-api/batches.md': pythonMyCodeApiBatches,
  'python/mycode-api/files-api.md': pythonMyCodeApiFilesApi,
  'python/mycode-api/streaming.md': pythonMyCodeApiStreaming,
  'python/mycode-api/tool-use.md': pythonMyCodeApiToolUse,
  'ruby/mycode-api.md': rubyMyCodeApi,
  'shared/error-codes.md': sharedErrorCodes,
  'shared/live-sources.md': sharedLiveSources,
  'shared/models.md': sharedModels,
  'shared/prompt-caching.md': sharedPromptCaching,
  'shared/tool-use-concepts.md': sharedToolUseConcepts,
  'typescript/agent-sdk/README.md': typescriptAgentSdkReadme,
  'typescript/agent-sdk/patterns.md': typescriptAgentSdkPatterns,
  'typescript/mycode-api/README.md': typescriptMyCodeApiReadme,
  'typescript/mycode-api/batches.md': typescriptMyCodeApiBatches,
  'typescript/mycode-api/files-api.md': typescriptMyCodeApiFilesApi,
  'typescript/mycode-api/streaming.md': typescriptMyCodeApiStreaming,
  'typescript/mycode-api/tool-use.md': typescriptMyCodeApiToolUse,
}
