import fs from 'fs/promises'
import path from 'path'
import type { StorageAdapter } from './StorageAdapter'

// Root lives outside /public so files are never web-accessible directly.
// Change this env var to point at a network mount or any other path.
const STORAGE_ROOT = process.env.DOCUMENT_STORAGE_PATH
  ?? path.join(process.cwd(), 'storage', 'documents')

export class LocalDiskAdapter implements StorageAdapter {
  async write(relativePath: string, buffer: Buffer): Promise<void> {
    const full = path.join(STORAGE_ROOT, relativePath)
    await fs.mkdir(path.dirname(full), { recursive: true })
    await fs.writeFile(full, buffer)
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      await fs.access(path.join(STORAGE_ROOT, relativePath))
      return true
    } catch {
      return false
    }
  }

  async read(relativePath: string): Promise<Buffer> {
    return fs.readFile(path.join(STORAGE_ROOT, relativePath))
  }

  absolutePath(relativePath: string): string {
    return path.join(STORAGE_ROOT, relativePath)
  }
}

// Singleton — one instance per process, shared across all archive calls.
export const diskAdapter = new LocalDiskAdapter()
