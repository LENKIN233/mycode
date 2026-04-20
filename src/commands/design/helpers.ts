export const DESIGN_ARTIFACT_DIR = 'artifacts/claude-design'
export type DesignTemplate = 'canvas' | 'prototype' | 'deck'

const TEMPLATE_FLAG = /(?:^|\s)--template\s+(canvas|prototype|deck)\b/i
const FILE_FLAG = /(?:^|\s)--file\s+(?:"([^"]+)"|'([^']+)'|(\S+))/i
const LATEST_FLAG = /(?:^|\s)--latest\b/i
const LIST_FLAG = /(?:^|\s)--list\b/i

export function parseDesignCommandArgs(args: string): {
  brief: string
  template?: DesignTemplate
  file?: string
  latest?: boolean
  list?: boolean
} {
  let remainder = args.trim()
  let template: DesignTemplate | undefined
  let file: string | undefined
  let latest = false
  let list = false

  const templateMatch = remainder.match(TEMPLATE_FLAG)
  if (templateMatch) {
    template = templateMatch[1].toLowerCase() as DesignTemplate
    remainder = remainder.replace(TEMPLATE_FLAG, ' ').trim()
  }

  const fileMatch = remainder.match(FILE_FLAG)
  if (fileMatch) {
    file = fileMatch[1] || fileMatch[2] || fileMatch[3]
    remainder = remainder.replace(FILE_FLAG, ' ').trim()
  }

  if (LATEST_FLAG.test(remainder)) {
    latest = true
    remainder = remainder.replace(LATEST_FLAG, ' ').trim()
  }

  if (LIST_FLAG.test(remainder)) {
    list = true
    remainder = remainder.replace(LIST_FLAG, ' ').trim()
  }

  return {
    brief: remainder,
    ...(template ? { template } : {}),
    ...(file ? { file } : {}),
    ...(latest ? { latest: true } : {}),
    ...(list ? { list: true } : {}),
  }
}

export function inferDesignTemplate(brief: string): DesignTemplate {
  const lower = brief.toLowerCase()

  if (
    /\b(deck|slides|slideshow|presentation|pitch|talk|keynote)\b/.test(lower)
  ) {
    return 'deck'
  }

  if (
    /\b(flow|prototype|onboarding|journey|wizard|interaction|checkout|signup|sign-up|form)\b/.test(
      lower,
    )
  ) {
    return 'prototype'
  }

  return 'canvas'
}

export function sanitizeDesignSlug(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return slug || 'design-artifact'
}

export function titleFromDesignBrief(brief: string): string {
  if (!brief.trim()) return 'Design Artifact'
  const line = brief.trim().split('\n')[0] || 'Design Artifact'
  return line.length > 60 ? `${line.slice(0, 57)}...` : line
}

export function buildDesignFollowupPrompt(
  brief: string,
  relativeFilePath: string,
  template: DesignTemplate,
): string {
  return [
    `Use the claude-design agent to create or refine the HTML artifact at \`${relativeFilePath}\`.`,
    'Treat that file as the primary deliverable for this iteration.',
    'Start from the existing starter file instead of rebuilding from scratch.',
    'Ground the design in local project context first, especially nearby UI and the design-system components under `src/components/design-system/` when relevant.',
    `The current starter template is \`${template}\`; keep it if it matches the brief, or evolve it deliberately rather than throwing away structure for no reason.`,
    'If the brief benefits from exploration, present at least 3 visual directions or option clusters inside the same artifact.',
    'For major revisions, preserve version history by creating a versioned copy in the same `artifacts/claude-design/` directory rather than overwriting blindly.',
    'Keep the output maintainable and prefer a polished, design-forward result over generic webpage tropes.',
    '',
    `Design brief: ${brief.trim() || 'Continue refining the existing artifact, replace placeholders with real design work, and tighten the strongest direction.'}`,
  ].join('\n')
}
