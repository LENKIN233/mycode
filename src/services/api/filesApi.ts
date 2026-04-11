// Stub: files API removed (Anthropic Files API)
export type File = { id: string; name: string }
export type FilesApiConfig = Record<string, any>
export type DownloadResult = { success: boolean }
export async function downloadFile() { return { success: false } }
export function buildDownloadPath() { return '' }
export async function downloadAndSaveFile() { return { success: false } }
export async function downloadSessionFiles() { return [] }
export type UploadResult = { success: boolean }
export async function uploadFile() { return { success: false } }
export async function uploadSessionFiles() { return [] }
export type FileMetadata = Record<string, any>
export async function listFilesCreatedAfter() { return [] }
export function parseFileSpecs() { return [] }
