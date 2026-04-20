import { createServer } from 'http'
import { readFile } from 'fs/promises'
import { basename, dirname, extname, resolve, sep } from 'path'
import type { DesignTemplate } from './helpers.js'

export type DesignVerificationResult = {
  ok: boolean
  warnings: string[]
  browser?: DesignBrowserVerificationResult
}

export type DesignBrowserVerificationResult = {
  attempted: boolean
  mode: 'playwright' | 'unavailable'
  warnings: string[]
  skippedReason?: string
  screenshotPath?: string
  url?: string
}

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webp': 'image/webp',
}

function contentTypeForPath(path: string): string {
  return MIME_TYPES[extname(path).toLowerCase()] || 'application/octet-stream'
}

function isWithinDirectory(parent: string, child: string): boolean {
  const normalizedParent = resolve(parent)
  const normalizedChild = resolve(child)
  return (
    normalizedChild === normalizedParent ||
    normalizedChild.startsWith(`${normalizedParent}${sep}`)
  )
}

async function withArtifactServer<T>(
  artifactPath: string,
  fn: (url: string) => Promise<T>,
): Promise<T> {
  const rootDir = dirname(artifactPath)
  const defaultFile = basename(artifactPath)

  const server = createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || '/', 'http://127.0.0.1')
      const relativePath =
        requestUrl.pathname === '/'
          ? defaultFile
          : decodeURIComponent(requestUrl.pathname.slice(1))
      const filePath = resolve(rootDir, relativePath)

      if (!isWithinDirectory(rootDir, filePath)) {
        res.statusCode = 403
        res.end('Forbidden')
        return
      }

      const content = await readFile(filePath)
      res.statusCode = 200
      res.setHeader('content-type', contentTypeForPath(filePath))
      res.end(content)
    } catch {
      res.statusCode = 404
      res.end('Not found')
    }
  })

  await new Promise<void>((resolvePromise, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolvePromise()
    })
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    server.close()
    throw new Error('Failed to determine local artifact server address')
  }

  const url = `http://127.0.0.1:${address.port}/${encodeURIComponent(defaultFile)}`

  try {
    return await fn(url)
  } finally {
    await new Promise<void>(resolvePromise => server.close(() => resolvePromise()))
  }
}

async function importPlaywright(): Promise<any | null> {
  try {
    const dynamicImport = new Function(
      'specifier',
      'return import(specifier)',
    ) as (specifier: string) => Promise<any>
    return await dynamicImport('playwright')
  } catch {
    return null
  }
}

export function getDesignArtifactPreviewImagePath(path: string): string {
  return path.replace(/\.html$/i, '.preview.png')
}

export function verifyDesignArtifactContent(
  html: string,
  template: DesignTemplate,
): DesignVerificationResult {
  const warnings: string[] = []

  const required = ['<!doctype html>', '<html', '<body', '<title>']
  for (const token of required) {
    if (!html.toLowerCase().includes(token)) {
      warnings.push(`Missing required HTML token: ${token}`)
    }
  }

  if (!html.includes('data-screen-label')) {
    warnings.push('Missing data-screen-label markers for major screens/slides')
  }

  if (!html.includes('localStorage')) {
    warnings.push('Missing localStorage persistence for starter state')
  }

  if (!html.includes('Tweaks')) {
    warnings.push('Missing visible Tweaks section')
  }

  if (template === 'deck' && !html.includes('slide-counter')) {
    warnings.push('Deck starter is missing slide counter wiring')
  }

  if (template === 'prototype' && !html.includes('Primary Screen')) {
    warnings.push('Prototype starter is missing primary-screen placeholder')
  }

  if (template === 'canvas' && !html.includes('Design directions')) {
    warnings.push('Canvas starter is missing design-direction comparison section')
  }

  return {
    ok: warnings.length === 0,
    warnings,
  }
}

export function inferDesignTemplateFromArtifactContent(
  html: string,
): DesignTemplate {
  if (html.includes('slide-counter') || html.includes('Deck starter')) {
    return 'deck'
  }

  if (
    html.includes('Primary Screen') ||
    html.includes('Prototype starter') ||
    html.includes('Flow framing')
  ) {
    return 'prototype'
  }

  return 'canvas'
}

export async function verifyDesignArtifactBrowser(
  path: string,
): Promise<DesignBrowserVerificationResult> {
  const playwright = await importPlaywright()
  if (!playwright?.chromium) {
    return {
      attempted: false,
      mode: 'unavailable',
      warnings: [],
      skippedReason: 'Playwright is not installed',
    }
  }

  const screenshotPath = getDesignArtifactPreviewImagePath(path)
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const failedRequests: string[] = []

  try {
    return await withArtifactServer(path, async url => {
      const browser = await playwright.chromium.launch({ headless: true })

      try {
        const page = await browser.newPage({
          viewport: { width: 1440, height: 1024 },
        })

        page.on('console', (message: any) => {
          if (message.type() === 'error') {
            consoleErrors.push(message.text())
          }
        })
        page.on('pageerror', (error: Error) => {
          pageErrors.push(error.message)
        })
        page.on('requestfailed', (request: any) => {
          const failure = request.failure?.()
          failedRequests.push(
            `${request.method()} ${request.url()} (${failure?.errorText || 'request failed'})`,
          )
        })

        await page.goto(url, { waitUntil: 'load' })
        await page.waitForTimeout(250)
        await page.screenshot({ path: screenshotPath, fullPage: true })

        const warnings: string[] = []
        if (consoleErrors.length > 0) {
          warnings.push(`Browser console errors: ${consoleErrors.join(' | ')}`)
        }
        if (pageErrors.length > 0) {
          warnings.push(`Browser page errors: ${pageErrors.join(' | ')}`)
        }
        if (failedRequests.length > 0) {
          warnings.push(`Browser failed requests: ${failedRequests.join(' | ')}`)
        }

        return {
          attempted: true,
          mode: 'playwright' as const,
          warnings,
          screenshotPath,
          url,
        }
      } finally {
        await browser.close()
      }
    })
  } catch (error) {
    return {
      attempted: false,
      mode: 'unavailable',
      warnings: [],
      skippedReason:
        error instanceof Error
          ? `Browser verification unavailable: ${error.message}`
          : 'Browser verification unavailable',
    }
  }
}

export async function verifyDesignArtifactFile(
  path: string,
  template: DesignTemplate,
  options?: {
    includeBrowser?: boolean
  },
): Promise<DesignVerificationResult> {
  const html = await readFile(path, 'utf-8')
  const base = verifyDesignArtifactContent(html, template)

  if (!options?.includeBrowser) {
    return base
  }

  const browser = await verifyDesignArtifactBrowser(path)
  const warnings = [...base.warnings, ...browser.warnings]

  return {
    ok: warnings.length === 0,
    warnings,
    browser,
  }
}

export async function inferDesignTemplateFromArtifactFile(
  path: string,
): Promise<DesignTemplate> {
  const html = await readFile(path, 'utf-8')
  return inferDesignTemplateFromArtifactContent(html)
}
