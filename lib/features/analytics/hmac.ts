// HMAC-SHA256 verification for the analytics ingestion endpoint.
//
// The e-shop signs every request with:
//   signature = HMAC-SHA256(secret, timestamp + "." + rawBody)
// and sends:
//   X-Analytics-Timestamp: <unix seconds>
//   X-Analytics-Signature: sha256=<hex>
//
// Replay protection: reject if |now - timestamp| > 300 seconds.

import { createHmac, timingSafeEqual } from 'crypto'

const MAX_TIMESTAMP_DRIFT_SECONDS = 300

export type HmacVerifyResult =
  | { ok: true }
  | { ok: false; status: 401 | 400; message: string }

export function verifyAnalyticsHmac(
  secret: string,
  timestampHeader: string | null,
  signatureHeader: string | null,
  rawBody: string,
): HmacVerifyResult {
  if (!timestampHeader || !signatureHeader) {
    return { ok: false, status: 401, message: 'Missing analytics signature headers' }
  }

  const timestamp = parseInt(timestampHeader, 10)
  if (isNaN(timestamp)) {
    return { ok: false, status: 400, message: 'Invalid timestamp header' }
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSeconds - timestamp) > MAX_TIMESTAMP_DRIFT_SECONDS) {
    return { ok: false, status: 401, message: 'Request timestamp outside allowed window — possible replay' }
  }

  const provided = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7)
    : signatureHeader

  const expected = createHmac('sha256', secret)
    .update(`${timestampHeader}.${rawBody}`)
    .digest('hex')

  let isValid: boolean
  try {
    isValid = timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(provided.padEnd(expected.length, '0').slice(0, expected.length), 'hex'),
    )
    // Extra length check — timingSafeEqual always compares same-length buffers above;
    // reject if the provided hex is a different length than expected.
    if (provided.length !== expected.length) isValid = false
  } catch {
    isValid = false
  }

  if (!isValid) {
    return { ok: false, status: 401, message: 'Invalid analytics signature' }
  }

  return { ok: true }
}
