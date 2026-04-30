import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALG = 'aes-256-gcm'

function getEncryptionKey(): Buffer {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY
  if (!raw) throw new Error('SETTINGS_ENCRYPTION_KEY is not set')
  const buf = Buffer.from(raw, 'hex')
  if (buf.length !== 32) throw new Error('SETTINGS_ENCRYPTION_KEY must be exactly 64 hex chars (32 bytes)')
  return buf
}

// Returns "iv:authTag:ciphertext" — all hex-encoded, colon-separated.
export function encrypt(plaintext: string): string {
  const key    = getEncryptionKey()
  const iv     = randomBytes(12)
  const cipher = createCipheriv(ALG, key, iv)
  const enc    = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag    = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`
}

export function decrypt(stored: string): string {
  const key              = getEncryptionKey()
  const [ivHex, tagHex, encHex] = stored.split(':')
  const decipher = createDecipheriv(ALG, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return Buffer.concat([
    decipher.update(Buffer.from(encHex, 'hex')),
    decipher.final(),
  ]).toString('utf8')
}

// Safe preview — shows prefix + **** + last 4 chars.
export function maskKey(key: string): string {
  if (key.length <= 12) return '****'
  const prefix = key.startsWith('sup_sk_') ? 'sup_sk_' : key.slice(0, 7)
  return `${prefix}****${key.slice(-4)}`
}
