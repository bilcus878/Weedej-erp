'use client'

import { useState, useEffect } from 'react'
import { completeInvoice } from '../services/receivedInvoiceService'
import type { ReceivedInvoice, CompleteInvoicePayload } from '../types'

export interface CompleteInvoiceFormData {
  invoiceNumber:  string
  invoiceDate:    string
  dueDate:        string
  paymentType:    string
  variableSymbol: string
  constantSymbol: string
  specificSymbol: string
  note:           string
}

const EMPTY: CompleteInvoiceFormData = {
  invoiceNumber:  '',
  invoiceDate:    '',
  dueDate:        '',
  paymentType:    '',
  variableSymbol: '',
  constantSymbol: '',
  specificSymbol: '',
  note:           '',
}

function toDate(val: string | null | undefined): string {
  return val ? new Date(val).toISOString().split('T')[0] : ''
}

// Normalize legacy 'transfer' value to 'bank_transfer' for consistent UI state
function normalizePaymentType(val: string | undefined): string {
  if (val === 'transfer') return 'bank_transfer'
  return val || ''
}

export function useCompleteInvoiceForm(
  invoice:   ReceivedInvoice | null,
  onSuccess: () => Promise<void>
) {
  const [formData,     setFormData]     = useState<CompleteInvoiceFormData>({ ...EMPTY })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Populate form when the selected invoice changes
  useEffect(() => {
    if (!invoice) return
    setFormData({
      // Don't pre-fill provisional numbers — force user to enter the real one
      invoiceNumber:  invoice.isTemporary ? '' : invoice.invoiceNumber,
      invoiceDate:    toDate(invoice.invoiceDate),
      dueDate:        toDate(invoice.dueDate),
      paymentType:    normalizePaymentType(invoice.paymentType),
      variableSymbol: invoice.variableSymbol || '',
      constantSymbol: invoice.constantSymbol || '',
      specificSymbol: invoice.specificSymbol || '',
      note:           invoice.note           || '',
    })
    setErrorMessage(null)
  }, [invoice])

  function handleFieldChange(field: keyof CompleteInvoiceFormData, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!invoice) return

    if (!formData.invoiceNumber.trim()) {
      setErrorMessage('Číslo faktury od dodavatele je povinné')
      return
    }
    if (!formData.invoiceDate) {
      setErrorMessage('Datum vystavení faktury je povinné')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const payload: CompleteInvoicePayload = {
      invoiceNumber:  formData.invoiceNumber.trim(),
      invoiceDate:    formData.invoiceDate,
      dueDate:        formData.dueDate || null,
      paymentType:    formData.paymentType || 'bank_transfer',
      variableSymbol: formData.variableSymbol || null,
      constantSymbol: formData.constantSymbol || null,
      specificSymbol: formData.specificSymbol || null,
      note:           formData.note || null,
    }

    try {
      await completeInvoice(invoice.id, payload)
      await onSuccess()
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Nepodařilo se uložit fakturu')
    } finally {
      setIsSubmitting(false)
    }
  }

  return { formData, isSubmitting, errorMessage, handleFieldChange, handleSubmit }
}
