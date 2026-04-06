/**
 * SQLite-backed memory index with FTS5 full-text search.
 *
 * Adds a fast search layer on top of the existing memory system
 * (markdown files in ~/.mycode/projects/<path>/memory/). Indexes
 * memory file content for keyword search and ranks results by
 * BM25 relevance + recency. Falls back gracefully if SQLite is
 * unavailable — the existing LLM-based memory selection still works.
 *
 * Features:
 * - FTS5 full-text search across all memory files
 * - Cross-project memory search (optional)
 * - Automatic re-indexing on file changes (mtime-based)
 * - BM25 ranking with recency boost
 * - Zero external dependencies (uses bun:sqlite)
 */

import { Database, type Statement } from 'bun:sqlite'
import { readdir, readFile, stat } from 'fs/promises'
import { basename, join } from 'path'
import { getConfigHomeDir } from '../../utils/envUtils.js'
import { logForDebugging } from '../../utils/debug.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IndexedMemory = {
  id: number
  filePath: string
  projectKey: string
  filename: string
  description: string | null
  memoryType: string | null
  content: string
  mtimeMs: number
  indexedAt: number
}

export type SearchResult = {
  filePath: string
  filename: string
  projectKey: string
  description: string | null
  snippet: string
  rank: number
  mtimeMs: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DB_FILENAME = 'memory-index.sqlite'
const MAX_CONTENT_LENGTH = 50_000 // 50KB per file
const MAX_RESULTS = 20
const RECENCY_WEIGHT = 0.3 // how much recency affects ranking

// ---------------------------------------------------------------------------
// Database singleton
// ---------------------------------------------------------------------------

let _db: Database | null = null

function getDbPath(): string {
  return join(getConfigHomeDir(), DB_FILENAME)
}

function getDb(): Database {
  if (_db) return _db
  try {
    _db = new Database(getDbPath())
    _db.exec('PRAGMA journal_mode = WAL')
    _db.exec('PRAGMA synchronous = NORMAL')
    initSchema(_db)
    return _db
  } catch (err) {
    logForDebugging(`[memoryIndex] Failed to open DB: ${err}`)
    throw err
  }
}

function initSchema(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT UNIQUE NOT NULL,
      project_key TEXT NOT NULL,
      filename TEXT NOT NULL,
      description TEXT,
      memory_type TEXT,
      content TEXT NOT NULL,
      mtime_ms REAL NOT NULL,
      indexed_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `)

  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
      file_path,
      filename,
      description,
      content,
      content='memories',
      content_rowid='id',
      tokenize='porter unicode61'
    )
  `)

  // Triggers to keep FTS in sync with the content table
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
      INSERT INTO memories_fts(rowid, file_path, filename, description, content)
      VALUES (new.id, new.file_path, new.filename, new.description, new.content);
    END
  `)
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, file_path, filename, description, content)
      VALUES ('delete', old.id, old.file_path, old.filename, old.description, old.content);
    END
  `)
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
      INSERT INTO memories_fts(memories_fts, rowid, file_path, filename, description, content)
      VALUES ('delete', old.id, old.file_path, old.filename, old.description, old.content);
      INSERT INTO memories_fts(rowid, file_path, filename, description, content)
      VALUES (new.id, new.file_path, new.filename, new.description, new.content);
    END
  `)

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_memories_project ON memories(project_key)
  `)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_memories_mtime ON memories(mtime_ms DESC)
  `)
}

// ---------------------------------------------------------------------------
// Indexing
// ---------------------------------------------------------------------------

/**
 * Index all .md memory files in a directory. Only re-indexes files
 * whose mtime has changed since last indexing.
 */
export async function indexMemoryDir(
  memoryDir: string,
  projectKey: string,
): Promise<{ indexed: number; skipped: number; removed: number }> {
  const db = getDb()
  let indexed = 0
  let skipped = 0
  let removed = 0

  try {
    const entries = await readdir(memoryDir, { recursive: true })
    const mdFiles = entries.filter(f => f.endsWith('.md'))
    const currentPaths = new Set<string>()

    const upsertStmt = db.prepare(`
      INSERT INTO memories (file_path, project_key, filename, description, memory_type, content, mtime_ms, indexed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch())
      ON CONFLICT(file_path) DO UPDATE SET
        description = excluded.description,
        memory_type = excluded.memory_type,
        content = excluded.content,
        mtime_ms = excluded.mtime_ms,
        indexed_at = unixepoch()
    `)

    const getStmt = db.prepare(
      'SELECT mtime_ms FROM memories WHERE file_path = ?',
    )

    for (const relPath of mdFiles) {
      const filePath = join(memoryDir, relPath)
      currentPaths.add(filePath)

      try {
        const fileStat = await stat(filePath)
        const mtimeMs = fileStat.mtimeMs

        // Skip if mtime unchanged
        const existing = getStmt.get(filePath) as
          | { mtime_ms: number }
          | null
        if (existing && Math.abs(existing.mtime_ms - mtimeMs) < 1) {
          skipped++
          continue
        }

        let content = await readFile(filePath, 'utf-8')
        if (content.length > MAX_CONTENT_LENGTH) {
          content = content.slice(0, MAX_CONTENT_LENGTH)
        }

        // Parse frontmatter for description and type
        const { description, memoryType } = parseFrontmatterBasic(content)

        upsertStmt.run(
          filePath,
          projectKey,
          basename(relPath),
          description,
          memoryType,
          content,
          mtimeMs,
        )
        indexed++
      } catch {
        // Skip unreadable files
      }
    }

    // Remove entries for deleted files
    const existingPaths = db
      .prepare(
        'SELECT file_path FROM memories WHERE project_key = ?',
      )
      .all(projectKey) as { file_path: string }[]

    for (const row of existingPaths) {
      if (!currentPaths.has(row.file_path)) {
        db.prepare('DELETE FROM memories WHERE file_path = ?').run(
          row.file_path,
        )
        removed++
      }
    }
  } catch (err) {
    logForDebugging(`[memoryIndex] indexMemoryDir error: ${err}`)
  }

  return { indexed, skipped, removed }
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Search indexed memories using FTS5 full-text search.
 * Returns results ranked by BM25 relevance with a recency boost.
 *
 * @param query - Search query (supports FTS5 syntax: AND, OR, NOT, "phrases")
 * @param projectKey - Optional: restrict to a specific project
 * @param limit - Max results (default 20)
 */
export function searchMemories(
  query: string,
  projectKey?: string,
  limit: number = MAX_RESULTS,
): SearchResult[] {
  const db = getDb()

  try {
    // Sanitize query for FTS5 - escape special chars
    const sanitized = sanitizeFtsQuery(query)
    if (!sanitized) return []

    let sql: string
    let params: (string | number)[]

    if (projectKey) {
      sql = `
        SELECT
          m.file_path,
          m.filename,
          m.project_key,
          m.description,
          snippet(memories_fts, 3, '<b>', '</b>', '...', 32) as snippet,
          bm25(memories_fts) as bm25_rank,
          m.mtime_ms
        FROM memories_fts
        JOIN memories m ON m.id = memories_fts.rowid
        WHERE memories_fts MATCH ?
          AND m.project_key = ?
        ORDER BY bm25(memories_fts)
        LIMIT ?
      `
      params = [sanitized, projectKey, limit]
    } else {
      sql = `
        SELECT
          m.file_path,
          m.filename,
          m.project_key,
          m.description,
          snippet(memories_fts, 3, '<b>', '</b>', '...', 32) as snippet,
          bm25(memories_fts) as bm25_rank,
          m.mtime_ms
        FROM memories_fts
        JOIN memories m ON m.id = memories_fts.rowid
        WHERE memories_fts MATCH ?
        ORDER BY bm25(memories_fts)
        LIMIT ?
      `
      params = [sanitized, limit]
    }

    const rows = db.prepare(sql).all(...params) as Array<{
      file_path: string
      filename: string
      project_key: string
      description: string | null
      snippet: string
      bm25_rank: number
      mtime_ms: number
    }>

    // Apply recency boost
    const now = Date.now()
    const maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days

    return rows.map(row => ({
      filePath: row.file_path,
      filename: row.filename,
      projectKey: row.project_key,
      description: row.description,
      snippet: row.snippet,
      rank:
        row.bm25_rank *
        (1 -
          RECENCY_WEIGHT *
            Math.min(1, (now - row.mtime_ms) / maxAge)),
      mtimeMs: row.mtime_ms,
    }))
  } catch (err) {
    logForDebugging(`[memoryIndex] search error: ${err}`)
    return []
  }
}

/**
 * Get memory statistics for a project or all projects.
 */
export function getMemoryStats(projectKey?: string): {
  totalFiles: number
  totalProjects: number
  oldestMs: number | null
  newestMs: number | null
} {
  const db = getDb()

  const where = projectKey
    ? 'WHERE project_key = ?'
    : ''
  const params = projectKey ? [projectKey] : []

  const countRow = db
    .prepare(`SELECT COUNT(*) as cnt FROM memories ${where}`)
    .get(...params) as { cnt: number }

  const projectRow = db
    .prepare(
      `SELECT COUNT(DISTINCT project_key) as cnt FROM memories ${where}`,
    )
    .get(...params) as { cnt: number }

  const rangeRow = db
    .prepare(
      `SELECT MIN(mtime_ms) as oldest, MAX(mtime_ms) as newest FROM memories ${where}`,
    )
    .get(...params) as { oldest: number | null; newest: number | null }

  return {
    totalFiles: countRow.cnt,
    totalProjects: projectRow.cnt,
    oldestMs: rangeRow.oldest,
    newestMs: rangeRow.newest,
  }
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

export function closeMemoryIndex(): void {
  if (_db) {
    _db.close()
    _db = null
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseFrontmatterBasic(content: string): {
  description: string | null
  memoryType: string | null
} {
  let description: string | null = null
  let memoryType: string | null = null

  if (!content.startsWith('---')) {
    return { description, memoryType }
  }

  const endIdx = content.indexOf('\n---', 3)
  if (endIdx === -1) {
    return { description, memoryType }
  }

  const frontmatter = content.slice(4, endIdx)
  for (const line of frontmatter.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim().toLowerCase()
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (key === 'description') description = value
    if (key === 'type') memoryType = value
  }

  return { description, memoryType }
}

/**
 * Sanitize a user query for FTS5 MATCH syntax.
 * Wraps individual words in quotes if they contain special chars.
 */
function sanitizeFtsQuery(query: string): string {
  const trimmed = query.trim()
  if (!trimmed) return ''

  // If already quoted, pass through
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed

  // Split into words and handle each
  const words = trimmed
    .split(/\s+/)
    .filter(w => w.length > 0)
    .map(w => {
      // Escape FTS5 special characters by quoting
      if (/[^a-zA-Z0-9_\u4e00-\u9fff]/.test(w)) {
        return `"${w.replace(/"/g, '""')}"`
      }
      return w
    })

  return words.join(' ')
}
