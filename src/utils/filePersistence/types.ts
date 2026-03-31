export type TurnStartTime = number

export const DEFAULT_UPLOAD_CONCURRENCY = 5
export const FILE_COUNT_LIMIT = 100
export const OUTPUTS_SUBDIR = 'outputs'

export interface PersistedFile {
  path: string
  fileId?: string
  size?: number
}

export interface FailedPersistence {
  path: string
  error: string
}

export interface FilesPersistedEventData {
  persistedFiles: PersistedFile[]
  failedFiles: FailedPersistence[]
  totalFiles: number
}
