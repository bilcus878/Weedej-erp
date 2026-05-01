export interface StorageAdapter {
  write(relativePath: string, buffer: Buffer): Promise<void>
  exists(relativePath: string): Promise<boolean>
  read(relativePath: string): Promise<Buffer>
  /** Absolute path for debugging / direct streaming — not required for cloud adapters */
  absolutePath?(relativePath: string): string
}
