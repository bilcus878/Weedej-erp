/**
 * zodSchemas — reusable primitive building blocks for all domain schemas.
 *
 * These are the atoms. strictSchemas.ts composes them into full DTOs.
 * Import from here to avoid duplicating `.trim().min(1)` patterns everywhere.
 */

import { z } from 'zod'

// ── Primitives ────────────────────────────────────────────────────────────────

export const nonEmptyString = z.string().trim().min(1, 'Povinné pole')

export const optionalString = z
  .string()
  .trim()
  .transform(v => (v === '' ? null : v))
  .nullable()
  .optional()

export const positiveInt = z
  .number({ error: 'Musí být celé číslo' })
  .int('Musí být celé číslo')
  .positive('Musí být kladné číslo')

export const positiveDecimal = z
  .number({ error: 'Musí být číslo' })
  .positive('Musí být kladné číslo')

export const nonNegativeDecimal = z
  .number({ error: 'Musí být číslo' })
  .min(0, 'Nesmí být záporné')

export const percentRate = z
  .number()
  .min(0,   'Nesmí být záporné')
  .max(100, 'Nesmí překročit 100')

// ── IDs ───────────────────────────────────────────────────────────────────────

export const cuid = z
  .string()
  .min(1, 'ID je povinné')
  .regex(/^[a-z0-9_-]{10,}$/i, 'Neplatné ID')

export const optionalCuid = cuid.nullable().optional()

// ── Dates ─────────────────────────────────────────────────────────────────────

export const isoDateString = z
  .string()
  .refine(v => !isNaN(Date.parse(v)), 'Neplatné datum (ISO 8601 required)')
  .transform(v => new Date(v))

export const optionalIsoDate = z
  .string()
  .optional()
  .nullable()
  .transform(v => (v ? new Date(v) : null))
  .refine(v => v === null || !isNaN(v.getTime()), 'Neplatné datum')

// ── Czech business identifiers ────────────────────────────────────────────────

export const icoSchema = z
  .string()
  .trim()
  .regex(/^\d{8}$/, 'IČO musí mít přesně 8 číslic')
  .optional()
  .nullable()

export const dicSchema = z
  .string()
  .trim()
  .regex(/^CZ\d{8,10}$/, 'DIČ musí mít formát CZ########')
  .optional()
  .nullable()

export const czechPostalCode = z
  .string()
  .trim()
  .regex(/^\d{3}\s?\d{2}$/, 'Neplatné PSČ (format: 12345 nebo 123 45)')
  .optional()
  .nullable()

// ── Email / Phone ─────────────────────────────────────────────────────────────

export const emailAddress = z
  .string()
  .trim()
  .email('Neplatná e-mailová adresa')
  .max(320, 'E-mail je příliš dlouhý')
  .optional()
  .nullable()

export const phoneNumber = z
  .string()
  .trim()
  .regex(/^[+\d\s\-()]{7,20}$/, 'Neplatné telefonní číslo')
  .optional()
  .nullable()

// ── VAT rates (Czech market) ──────────────────────────────────────────────────

export const vatRateSchema = z
  .union([
    z.literal(0),
    z.literal(10),
    z.literal(12),
    z.literal(21),
  ])
  .default(21)

// ── Currency / amounts ────────────────────────────────────────────────────────

export const currencyCode = z
  .string()
  .length(3, 'ISO 4217 currency code must be 3 characters')
  .toUpperCase()
  .default('CZK')

export const monetaryAmount = z
  .number({ error: 'Musí být číslo' })
  .multipleOf(0.01, 'Maximálně 2 desetinná místa')

// ── Pagination ────────────────────────────────────────────────────────────────

export const paginationQuery = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  sort:  z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
})

export type PaginationQuery = z.infer<typeof paginationQuery>

// ── Search ────────────────────────────────────────────────────────────────────

export const searchQuery = z.object({
  search: z.string().trim().max(200).optional(),
})

// ── Date range ────────────────────────────────────────────────────────────────

export const dateRangeQuery = z.object({
  from: z.coerce.date().optional(),
  to:   z.coerce.date().optional(),
}).refine(
  d => !d.from || !d.to || d.from <= d.to,
  '"from" must be before or equal to "to"',
)

export type DateRangeQuery = z.infer<typeof dateRangeQuery>

// ── Payment types ─────────────────────────────────────────────────────────────

export const paymentTypeSchema = z.enum(['cash', 'bank_transfer', 'card', 'online'])

// ── Address ───────────────────────────────────────────────────────────────────

export const addressSchema = z.object({
  street:  optionalString,
  city:    optionalString,
  zip:     czechPostalCode,
  country: z.string().trim().max(100).optional().nullable(),
})

export type AddressInput = z.infer<typeof addressSchema>

// ── Billing address (customer orders / invoices) ──────────────────────────────

export const billingAddressSchema = z.object({
  billingName:    optionalString,
  billingCompany: optionalString,
  billingIco:     icoSchema,
  billingDic:     dicSchema,
  billingStreet:  optionalString,
  billingCity:    optionalString,
  billingZip:     czechPostalCode,
  billingCountry: z.string().trim().max(100).optional().nullable(),
}).nullable().optional()

export type BillingAddressInput = z.infer<typeof billingAddressSchema>

// ── Discount ──────────────────────────────────────────────────────────────────

export const discountSchema = z.object({
  discountType:  z.enum(['percentage', 'fixed']).nullable().optional(),
  discountValue: z.number().min(0).nullable().optional(),
})

export type DiscountInput = z.infer<typeof discountSchema>
