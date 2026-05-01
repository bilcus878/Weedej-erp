/**
 * strictSchemas — complete, validated DTOs for every ERP domain.
 *
 * Rules:
 *  - Every incoming API request body MUST match one of these schemas.
 *  - .strict() is used where extra fields must never leak backend logic.
 *  - All monetary values validated to 2 decimal places.
 *  - All IDs validated as cuid strings (not raw UUIDs).
 *  - Czech-market specifics: VAT rates 0/10/12/21, IČO, DIČ, PSČ.
 */

import { z } from 'zod'
import {
  nonEmptyString, optionalString, cuid, optionalCuid,
  isoDateString, optionalIsoDate,
  icoSchema, dicSchema, emailAddress, phoneNumber,
  vatRateSchema, paymentTypeSchema,
  billingAddressSchema, discountSchema,
  nonNegativeDecimal, positiveDecimal, positiveInt,
  percentRate, currencyCode,
} from './zodSchemas'

// ═══════════════════════════════════════════════════════════════════════════════
// ORDER LINE ITEMS (shared across Customer Orders, Purchase Orders, Invoices)
// ═══════════════════════════════════════════════════════════════════════════════

export const orderLineItemSchema = z.object({
  productId:    optionalCuid,
  productName:  z.string().trim().max(500).nullable().optional(),
  quantity:     positiveDecimal,
  unit:         nonEmptyString.max(20),
  variantValue: z.number().positive().nullable().optional(),
  variantUnit:  z.string().trim().max(20).nullable().optional(),
  price:        nonNegativeDecimal,
  vatRate:      vatRateSchema,
}).refine(
  i => i.productId != null || (i.productName != null && i.productName.length > 0),
  { message: 'Položka musí mít productId nebo productName', path: ['productId'] }
)

export type OrderLineItemInput = z.infer<typeof orderLineItemSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

export const createCustomerOrderSchema = z.object({
  // Customer identification — one of the three modes is required
  customerId:          optionalCuid,
  isManualCustomer:    z.boolean().optional().default(false),
  isAnonymousCustomer: z.boolean().optional().default(false),
  saveCustomerToDatabase: z.boolean().optional().default(false),

  manualCustomerData: z.object({
    name:          nonEmptyString.max(500),
    entityType:    z.enum(['company', 'individual']).optional().default('company'),
    contactPerson: optionalString,
    email:         emailAddress,
    phone:         phoneNumber,
    ico:           icoSchema,
    dic:           dicSchema,
    bankAccount:   optionalString,
    address:       optionalString,
    note:          optionalString,
  }).nullable().optional(),

  // Order details
  orderDate: optionalIsoDate,
  note:      optionalString,
  items:     z.array(orderLineItemSchema).min(1, 'Objednávka musí obsahovat alespoň jednu položku'),

  // Payment
  dueDate:        isoDateString,
  paymentType:    z.string().trim().min(1, 'Forma úhrady je povinná'),
  variableSymbol: optionalString,
  constantSymbol: optionalString,
  specificSymbol: optionalString,

  // VAT
  pricesIncludeVat: z.boolean().optional().default(false),

  // Discount
  ...discountSchema.shape,

  // Shipping
  shippingMethod:      optionalString,
  pickupPointId:       optionalString,
  pickupPointName:     optionalString,
  pickupPointAddress:  optionalString,
  pickupPointCarrier:  optionalString,

  // Billing address
  billingAddress: billingAddressSchema,

  // SumUp integration
  sumupTransactionId: optionalString,
}).refine(
  d => d.customerId != null || d.isManualCustomer || d.isAnonymousCustomer,
  { message: 'Zákazník musí být vybrán, zadán ručně nebo anonymní', path: ['customerId'] }
)

export type CreateCustomerOrderInput = z.infer<typeof createCustomerOrderSchema>

export const updateCustomerOrderStatusSchema = z.object({
  status:   nonEmptyString,
  note:     optionalString,
  paidAt:   optionalIsoDate,
  shippedAt: optionalIsoDate,
}).strict()

export type UpdateCustomerOrderStatusInput = z.infer<typeof updateCustomerOrderStatusSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// PURCHASE ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

export const purchaseOrderLineItemSchema = z.object({
  productId:     cuid,
  quantity:      positiveDecimal,
  unit:          nonEmptyString.max(20),
  variantValue:  z.number().positive().nullable().optional(),
  variantUnit:   z.string().trim().max(20).nullable().optional(),
  expectedPrice: nonNegativeDecimal,
  vatRate:       vatRateSchema,
})

export type PurchaseOrderLineItemInput = z.infer<typeof purchaseOrderLineItemSchema>

export const createPurchaseOrderSchema = z.object({
  supplierId:    cuid,
  orderDate:     optionalIsoDate,
  expectedDate:  optionalIsoDate,
  note:          optionalString,
  items:         z.array(purchaseOrderLineItemSchema).min(1, 'Objednávka musí obsahovat alespoň jednu položku'),
  paymentType:   paymentTypeSchema.optional(),
  variableSymbol: optionalString,
  dueDate:       optionalIsoDate,
})

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// RECEIPTS (goods receipt)
// ═══════════════════════════════════════════════════════════════════════════════

export const receiptLineItemSchema = z.object({
  productId:     cuid,
  quantity:      positiveDecimal,
  unit:          nonEmptyString.max(20),
  variantValue:  z.number().positive().nullable().optional(),
  variantUnit:   z.string().trim().max(20).nullable().optional(),
  purchasePrice: nonNegativeDecimal,
  vatRate:       vatRateSchema,
  batchId:       optionalCuid,
})

export const createReceiptSchema = z.object({
  purchaseOrderId: optionalCuid,
  supplierId:      optionalCuid,
  receiptDate:     optionalIsoDate,
  note:            optionalString,
  items:           z.array(receiptLineItemSchema).min(1),
})

export type CreateReceiptInput = z.infer<typeof createReceiptSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// ISSUED INVOICES
// ═══════════════════════════════════════════════════════════════════════════════

export const createIssuedInvoiceSchema = z.object({
  customerOrderId:  optionalCuid,
  deliveryNoteId:   optionalCuid,
  invoiceDate:      optionalIsoDate,
  dueDate:          isoDateString,
  paymentType:      paymentTypeSchema,
  variableSymbol:   optionalString,
  constantSymbol:   optionalString,
  specificSymbol:   optionalString,
  note:             optionalString,
  items:            z.array(orderLineItemSchema).min(1).optional(),
})

export type CreateIssuedInvoiceInput = z.infer<typeof createIssuedInvoiceSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// RECEIVED INVOICES
// ═══════════════════════════════════════════════════════════════════════════════

export const createReceivedInvoiceSchema = z.object({
  supplierId:     cuid,
  purchaseOrderId: optionalCuid,
  invoiceNumber:  nonEmptyString.max(100),
  invoiceDate:    isoDateString,
  dueDate:        isoDateString,
  totalAmount:    nonNegativeDecimal,
  vatAmount:      nonNegativeDecimal.optional(),
  note:           optionalString,
  paymentType:    paymentTypeSchema.optional(),
  variableSymbol: optionalString,
})

export type CreateReceivedInvoiceInput = z.infer<typeof createReceivedInvoiceSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERY NOTES
// ═══════════════════════════════════════════════════════════════════════════════

export const deliveryNoteLineItemSchema = z.object({
  productId:    optionalCuid,
  productName:  optionalString,
  quantity:     positiveDecimal,
  unit:         nonEmptyString.max(20),
  variantValue: z.number().positive().nullable().optional(),
  variantUnit:  z.string().trim().max(20).nullable().optional(),
  price:        nonNegativeDecimal,
  vatRate:      vatRateSchema,
})

export const createDeliveryNoteSchema = z.object({
  customerOrderId: optionalCuid,
  deliveryDate:    optionalIsoDate,
  note:            optionalString,
  items:           z.array(deliveryNoteLineItemSchema).min(1),
})

export type CreateDeliveryNoteInput = z.infer<typeof createDeliveryNoteSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// RETURNS
// ═══════════════════════════════════════════════════════════════════════════════

export const returnItemSchema = z.object({
  sourceOrderItemId: optionalCuid,
  productName:       nonEmptyString.max(500),
  unit:              nonEmptyString.max(20),
  originalQuantity:  positiveDecimal,
  returnedQuantity:  positiveDecimal,
  unitPrice:         nonNegativeDecimal.optional(),
  unitPriceWithVat:  nonNegativeDecimal.optional(),
  vatRate:           vatRateSchema,
}).refine(
  i => i.returnedQuantity <= i.originalQuantity,
  { message: 'Vrácené množství nesmí překročit původní množství', path: ['returnedQuantity'] }
)

export const createReturnSchema = z.object({
  customerOrderId: optionalCuid,
  customerId:      optionalCuid,
  eshopUserId:     optionalCuid,
  type:            z.enum(['return', 'claim', 'exchange']),
  reason:          nonEmptyString.max(1000),
  reasonDetail:    optionalString,
  customerName:    optionalString,
  customerEmail:   emailAddress,
  customerPhone:   phoneNumber,
  customerAddress: optionalString,
  items:           z.array(returnItemSchema).min(1, 'Reklamace musí obsahovat alespoň jednu položku'),
})

export type CreateReturnInput = z.infer<typeof createReturnSchema>

export const approveReturnItemSchema = z.object({
  id:                  cuid,
  itemStatus:          z.enum(['approved', 'rejected', 'partial']),
  approvedQuantity:    positiveDecimal.nullable().optional(),
  condition:           z.string().max(100).nullable().optional(),
  conditionNote:       z.string().max(1000).nullable().optional(),
  itemRejectionReason: z.string().max(1000).nullable().optional(),
})

export const approveReturnSchema = z.object({
  items:          z.array(approveReturnItemSchema).min(1),
  resolutionType: z.enum(['refund', 'exchange', 'repair', 'store_credit', 'rejected']),
  adminNote:      optionalString,
})

export type ApproveReturnInput = z.infer<typeof approveReturnSchema>

export const rejectReturnSchema = z.object({
  rejectionReason: nonEmptyString.max(1000),
  adminNote:       optionalString,
}).strict()

export type RejectReturnInput = z.infer<typeof rejectReturnSchema>

export const processRefundSchema = z.object({
  refundMethod:    z.enum(['bank_transfer', 'cash', 'card', 'store_credit', 'original_payment']),
  refundReference: optionalString,
  adminNote:       optionalString,
}).strict()

export type ProcessRefundInput = z.infer<typeof processRefundSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMERS / SUPPLIERS (create/update)
// ═══════════════════════════════════════════════════════════════════════════════

export const createCustomerSchema = z.object({
  name:          nonEmptyString.max(500),
  entityType:    z.enum(['company', 'individual']).default('company'),
  contact:       optionalString,
  email:         emailAddress,
  phone:         phoneNumber,
  ico:           icoSchema,
  dic:           dicSchema,
  bankAccount:   optionalString,
  address:       optionalString,
  note:          optionalString,
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>

export const createSupplierSchema = createCustomerSchema.extend({
  paymentTermDays: z.number().int().min(0).max(365).optional(),
})

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════

export const createProductSchema = z.object({
  name:          nonEmptyString.max(500),
  sku:           optionalString,
  ean:           optionalString,
  categoryId:    optionalCuid,
  price:         nonNegativeDecimal,
  purchasePrice: nonNegativeDecimal.optional(),
  vatRate:       vatRateSchema,
  unit:          nonEmptyString.max(20),
  description:   optionalString,
  eshopActive:   z.boolean().optional().default(false),
})

export type CreateProductInput = z.infer<typeof createProductSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// CREDIT NOTES
// ═══════════════════════════════════════════════════════════════════════════════

export const createCreditNoteSchema = z.object({
  issuedInvoiceId: cuid,
  reason:          optionalString,
  note:            optionalString,
  items:           z.array(z.object({
    productId:   optionalCuid,
    productName: optionalString,
    quantity:    positiveDecimal,
    unit:        nonEmptyString.max(20),
    price:       nonNegativeDecimal,
    vatRate:     vatRateSchema,
  })).min(1),
})

export type CreateCreditNoteInput = z.infer<typeof createCreditNoteSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// STORNO (reversal)
// ═══════════════════════════════════════════════════════════════════════════════

export const stornoSchema = z.object({
  reason: optionalString,
}).strict()

export type StornoInput = z.infer<typeof stornoSchema>

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════

export const updateSettingsSchema = z.object({
  companyName:    optionalString,
  companyAddress: optionalString,
  companyCity:    optionalString,
  companyZip:     optionalString,
  companyIco:     icoSchema,
  companyDic:     dicSchema,
  companyPhone:   phoneNumber,
  companyEmail:   emailAddress,
  bankAccount:    optionalString,
  bankName:       optionalString,
  vatPayer:       z.boolean().optional(),
  defaultVatRate: vatRateSchema.optional(),
  invoiceNote:    optionalString,
  currency:       currencyCode.optional(),
})

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>
