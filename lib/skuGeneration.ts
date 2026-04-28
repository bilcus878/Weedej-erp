/**
 * SKU (Stock Keeping Unit) generation and uniqueness enforcement.
 *
 * Generation strategy (PRODUCTCODE-COLOR-SIZE):
 *   PRODUCTCODE — derived deterministically from the parent product name
 *   COLOR       — extracted from the variant name via a multilingual keyword list
 *   SIZE        — either variantValue+variantUnit (e.g. "30ML") or a clothing-size
 *                 keyword extracted from the variant name (e.g. "XL")
 *
 * Collision resolution:
 *   If the generated base SKU already exists the function appends a zero-padded
 *   counter (-001, -002 …) and retries, up to MAX_COLLISION_RETRIES attempts.
 *
 * All DB calls accept an optional Prisma transaction client (tx) so the entire
 * variant creation can be wrapped in a single atomic transaction.
 */

import { prisma } from '@/lib/prisma'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GenerateSkuParams {
  productName:  string
  variantName:  string
  variantValue?: number | null
  variantUnit?:  string | null
  /** When updating an existing variant, exclude it from the uniqueness check. */
  excludeId?:    string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_COLLISION_RETRIES = 999

/**
 * Czech + English color keywords mapped to their canonical uppercase SKU token.
 * Order matters: longer/more-specific entries should come first so that "světle modrá"
 * matches "LIGHTBLUE" before "BLUE".
 */
const COLOR_MAP: Array<[RegExp, string]> = [
  [/sv[eě]tle\s*modr[aá]/i,  'LIGHTBLUE'],
  [/sv[eě]tle\s*zelen[aá]/i, 'LIGHTGREEN'],
  [/sv[eě]tle\s*r[uů][zž]ov[aá]/i, 'LIGHTPINK'],
  [/tmav[eě]\s*modr[aá]/i,   'DARKBLUE'],
  [/tmav[eě]\s*zelen[aá]/i,  'DARKGREEN'],
  [/light\s*blue/i,           'LIGHTBLUE'],
  [/dark\s*blue/i,            'DARKBLUE'],
  [/light\s*green/i,          'LIGHTGREEN'],
  [/dark\s*green/i,           'DARKGREEN'],
  [/\blight\s*pink\b/i,       'LIGHTPINK'],
  [/\bčerven[aá]\b/i,         'RED'],
  [/\bmodr[aá]\b/i,           'BLUE'],
  [/\bzelen[aá]\b/i,          'GREEN'],
  [/\bžlut[aá]\b/i,           'YELLOW'],
  [/\bfialov[aá]\b/i,         'PURPLE'],
  [/\br[uů][zž]ov[aá]\b/i,   'PINK'],
  [/\boran[zž]ov[aá]\b/i,     'ORANGE'],
  [/\bhn[eě]d[aá]\b/i,       'BROWN'],
  [/\bbíl[aá]\b/i,            'WHITE'],
  [/\bčern[aá]\b/i,           'BLACK'],
  [/\bš[eě]d[aá]\b/i,        'GREY'],
  [/\bstř[íi]brn[aá]\b/i,    'SILVER'],
  [/\bzlatn[aá]\b/i,          'GOLD'],
  [/\bred\b/i,                'RED'],
  [/\bblue\b/i,               'BLUE'],
  [/\bgreen\b/i,              'GREEN'],
  [/\byellow\b/i,             'YELLOW'],
  [/\bpurple\b/i,             'PURPLE'],
  [/\bpink\b/i,               'PINK'],
  [/\borange\b/i,             'ORANGE'],
  [/\bbrown\b/i,              'BROWN'],
  [/\bwhite\b/i,              'WHITE'],
  [/\bblack\b/i,              'BLACK'],
  [/\bgrey\b/i,               'GREY'],
  [/\bgray\b/i,               'GREY'],
  [/\bsilver\b/i,             'SILVER'],
  [/\bgold\b/i,               'GOLD'],
]

/** Clothing / generic size keywords (longest first to catch XL before L). */
const SIZE_KEYWORDS: Array<[RegExp, string]> = [
  [/\bXXXL\b/i, 'XXXL'],
  [/\bXXL\b/i,  'XXL'],
  [/\bXXS\b/i,  'XXS'],
  [/\bXL\b/i,   'XL'],
  [/\bXS\b/i,   'XS'],
  [/\b3XL\b/i,  '3XL'],
  [/\b2XL\b/i,  '2XL'],
  [/\bLARGE\b/i,  'L'],
  [/\bMEDIUM\b/i, 'M'],
  [/\bSMALL\b/i,  'S'],
  [/\bVELK[YÁ]\b/i, 'L'],
  [/\bSTŘEDNÍ\b/i,  'M'],
  [/\bMALÝ\b/i,     'S'],
  [/\b(?:ONE[\s-]?SIZE|UNIVERSAL)\b/i, 'OS'],
  [/\bL\b/, 'L'],
  [/\bM\b/, 'M'],
  [/\bS\b/, 'S'],
]

// ─── Diacritics removal ───────────────────────────────────────────────────────

const DIACRITICS_MAP: Record<string, string> = {
  á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ů: 'u',
  ě: 'e', č: 'c', š: 's', ž: 'z', ř: 'r', ý: 'y',
  ď: 'd', ť: 't', ň: 'n',
  Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', Ů: 'U',
  Ě: 'E', Č: 'C', Š: 'S', Ž: 'Z', Ř: 'R', Ý: 'Y',
  Ď: 'D', Ť: 'T', Ň: 'N',
}

function removeDiacritics(text: string): string {
  return text.replace(/[áéíóúůěčšžřýďťňÁÉÍÓÚŮĚČŠŽŘÝĎŤŇ]/g, (ch) => DIACRITICS_MAP[ch] ?? ch)
}

// ─── Product code derivation ──────────────────────────────────────────────────

/**
 * Derive a short, deterministic product code from a product name.
 *
 * Algorithm:
 *   1. Strip diacritics and non-alphanumeric characters.
 *   2. Split into words and discard single-character words (unless only one word).
 *   3. Take the first 3 words; first word → up to 4 chars, remaining → up to 3 chars.
 *   4. Concatenate and uppercase; truncate to 10 characters.
 *
 * Examples:
 *   "Cannabis CBD Oil"  → "CANNCBDOIL"
 *   "Hemp Seed"         → "HEMPSEE"
 *   "Vitamín C"         → "VITC"
 *   "CBD"               → "CBD"
 */
export function deriveProductCode(productName: string): string {
  const clean = removeDiacritics(productName)
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .toUpperCase()
    .trim()

  const words = clean
    .split(/\s+/)
    .filter((w) => w.length > 0)

  // Keep only words with ≥ 2 characters, but preserve the list if that would empty it
  const significant = words.filter((w) => w.length > 1)
  const pool = significant.length > 0 ? significant : words

  if (pool.length === 0) return 'PROD'

  const parts: string[] = []
  parts.push(pool[0].slice(0, 4))
  if (pool[1]) parts.push(pool[1].slice(0, 3))
  if (pool[2]) parts.push(pool[2].slice(0, 3))

  return parts.join('').slice(0, 10)
}

// ─── Color + size extraction from variant name ────────────────────────────────

function extractColor(variantName: string): string | null {
  for (const [pattern, token] of COLOR_MAP) {
    if (pattern.test(variantName)) return token
  }
  return null
}

function extractSizeKeyword(variantName: string): string | null {
  for (const [pattern, token] of SIZE_KEYWORDS) {
    if (pattern.test(variantName)) return token
  }
  return null
}

/**
 * Derive the SIZE segment of the SKU.
 *   • If variantValue + variantUnit are present:  "30" + "ml" → "30ML"
 *   • Otherwise: scan variant name for a size keyword.
 *   • Returns null when neither is available.
 */
function extractSize(
  variantName: string,
  variantValue?: number | null,
  variantUnit?: string | null,
): string | null {
  if (variantValue != null && variantUnit) {
    const numPart = Number.isInteger(variantValue)
      ? String(variantValue)
      : variantValue.toFixed(1).replace(/\.0$/, '')
    return `${numPart}${variantUnit.toUpperCase()}`
  }
  return extractSizeKeyword(variantName)
}

// ─── SKU string assembly ──────────────────────────────────────────────────────

/**
 * Build the base (collision-free attempt) SKU string from its components.
 * Returns a string such as "HEMPSEE-RED-30ML", "HEMPSEE-30ML", or "HEMPSEE".
 */
export function buildSkuBase(
  productName: string,
  variantName: string,
  variantValue?: number | null,
  variantUnit?: string | null,
): string {
  const productCode = deriveProductCode(productName)
  const color = extractColor(variantName)
  const size  = extractSize(variantName, variantValue, variantUnit)

  const segments: string[] = [productCode]
  if (color) segments.push(color)
  if (size)  segments.push(size)

  return segments.join('-')
}

// ─── Uniqueness check ────────────────────────────────────────────────────────

async function isSkuTaken(
  sku: string,
  excludeId: string | undefined,
  tx: any,
): Promise<boolean> {
  const client = tx || prisma
  const count = await client.eshopVariant.count({
    where: {
      sku,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  })
  return count > 0
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Validate that a user-supplied SKU string meets format requirements.
 * Does NOT check DB uniqueness — call `assertSkuUnique` for that.
 *
 * Rules:
 *   • 1–64 characters
 *   • Only uppercase letters, digits, and hyphens
 *   • Must not start or end with a hyphen
 *   • Must not contain consecutive hyphens
 */
export function validateSkuFormat(sku: string): { valid: boolean; error?: string } {
  if (!sku || typeof sku !== 'string') {
    return { valid: false, error: 'SKU nesmí být prázdné' }
  }
  const trimmed = sku.trim()
  if (trimmed.length === 0) {
    return { valid: false, error: 'SKU nesmí být prázdné' }
  }
  if (trimmed.length > 64) {
    return { valid: false, error: 'SKU nesmí být delší než 64 znaků' }
  }
  if (!/^[A-Z0-9][A-Z0-9\-]*[A-Z0-9]$|^[A-Z0-9]$/.test(trimmed)) {
    return {
      valid: false,
      error:
        'SKU smí obsahovat pouze velká písmena, číslice a pomlčky; nesmí začínat ani končit pomlčkou',
    }
  }
  if (/--/.test(trimmed)) {
    return { valid: false, error: 'SKU nesmí obsahovat dvě pomlčky za sebou' }
  }
  return { valid: true }
}

/**
 * Normalise a raw SKU input for storage:
 *   - Trim whitespace
 *   - Uppercase
 *   - Collapse multiple spaces/dashes
 */
export function normaliseSku(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '-').replace(/-{2,}/g, '-')
}

/**
 * Check that a (normalised) SKU is not already used by another variant.
 * Throws an Error with a user-facing message if it is taken.
 */
export async function assertSkuUnique(
  sku: string,
  excludeId: string | undefined,
  tx?: any,
): Promise<void> {
  const taken = await isSkuTaken(sku, excludeId, tx)
  if (taken) {
    throw new Error(`SKU "${sku}" je již použito jinou variantou`)
  }
}

/**
 * Auto-generate a unique SKU for a variant.
 *
 * 1. Build the base SKU from product + variant metadata.
 * 2. If it is free, return it immediately.
 * 3. Otherwise, try <base>-001, <base>-002 … <base>-999.
 * 4. If all are taken (extremely unlikely), append a 6-char random hex suffix.
 *
 * @param params    - Product/variant metadata used for code generation.
 * @param tx        - Optional Prisma transaction client.
 */
export async function generateUniqueSku(
  params: GenerateSkuParams,
  tx?: any,
): Promise<string> {
  const { productName, variantName, variantValue, variantUnit, excludeId } = params

  const base = buildSkuBase(productName, variantName, variantValue, variantUnit)

  if (!(await isSkuTaken(base, excludeId, tx))) {
    return base
  }

  for (let i = 1; i <= MAX_COLLISION_RETRIES; i++) {
    const candidate = `${base}-${String(i).padStart(3, '0')}`
    if (!(await isSkuTaken(candidate, excludeId, tx))) {
      return candidate
    }
  }

  // Last-resort fallback: truncate base + random hex (collision probability negligible)
  const hex = Math.random().toString(16).slice(2, 8).toUpperCase()
  return `${base.slice(0, 8)}-${hex}`
}
