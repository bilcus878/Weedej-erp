'use client'

import { useRef, useState } from 'react'
import { DEFAULT_VAT_RATE, NON_VAT_PAYER_RATE } from '@/lib/vatCalculation'
import { fetchNextOrderNumber, createPurchaseOrder } from '../services/purchaseOrderService'
import type { PurchaseOrderItem, ManualSupplierData, Product } from '../types'

const EMPTY_MANUAL_SUPPLIER: ManualSupplierData = {
  name: '', entityType: 'company', contactPerson: '', email: '', phone: '',
  ico: '', dic: '', bankAccount: '', website: '', address: '', note: '',
}

export function useCreatePurchaseOrderForm(
  products:   Product[],
  isVatPayer: boolean,
  onSuccess:  () => Promise<void>,
) {
  const [open,                   setOpen]                   = useState(false)
  const [orderNumber,            setOrderNumber]            = useState('')
  const [orderDate,              setOrderDate]              = useState(() => new Date().toISOString().split('T')[0])
  const [supplierId,             setSupplierId]             = useState('')
  const [expectedDate,           setExpectedDate]           = useState('')
  const [note,                   setNote]                   = useState('')
  const [items,                  setItems]                  = useState<PurchaseOrderItem[]>([])
  const [dueDate,                setDueDate]                = useState('')
  const [paymentType,            setPaymentType]            = useState('')
  const [variableSymbol,         setVariableSymbol]         = useState('')
  const [constantSymbol,         setConstantSymbol]         = useState('')
  const [specificSymbol,         setSpecificSymbol]         = useState('')
  const [isManualSupplier,       setIsManualSupplier]       = useState(false)
  const [isAnonymousSupplier,    setIsAnonymousSupplier]    = useState(false)
  const [saveSupplierToDatabase, setSaveSupplierToDatabase] = useState(false)
  const [manualSupplierData,     setManualSupplierData]     = useState<ManualSupplierData>({ ...EMPTY_MANUAL_SUPPLIER })
  const [discountType,           setDiscountType]           = useState<'percentage' | 'fixed' | 'none'>('none')
  const [discountValue,          setDiscountValue]          = useState('')

  const categoryMenuRef       = useRef<HTMLDivElement>(null)
  const hideSubmenuTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  function reset() {
    setOrderDate(new Date().toISOString().split('T')[0])
    setOrderNumber('')
    setSupplierId('')
    setExpectedDate('')
    setNote('')
    setItems([])
    setDueDate('')
    setPaymentType('')
    setVariableSymbol('')
    setConstantSymbol('')
    setSpecificSymbol('')
    setIsManualSupplier(false)
    setIsAnonymousSupplier(false)
    setSaveSupplierToDatabase(false)
    setManualSupplierData({ ...EMPTY_MANUAL_SUPPLIER })
    setDiscountType('none')
    setDiscountValue('')
  }

  async function handleOpen() {
    const today         = new Date().toISOString().split('T')[0]
    const nextNumber    = await fetchNextOrderNumber(today)
    const defaultVatRate = isVatPayer ? DEFAULT_VAT_RATE : NON_VAT_PAYER_RATE
    setOrderDate(today)
    setOrderNumber(nextNumber)
    setItems([{ productId: '', productName: '', isManual: false, quantity: 1, unit: 'ks', expectedPrice: 0, vatRate: defaultVatRate }])
    setOpen(true)
  }

  function handleClose() { setOpen(false); reset() }

  async function handleOrderDateChange(newDate: string) {
    setOrderDate(newDate)
    const nextNumber = await fetchNextOrderNumber(newDate)
    setOrderNumber(nextNumber)
  }

  function handleAddItem() {
    const defaultVatRate = isVatPayer ? DEFAULT_VAT_RATE : NON_VAT_PAYER_RATE
    setItems(prev => [...prev, { productId: '', productName: '', isManual: false, quantity: 1, unit: 'ks', expectedPrice: 0, vatRate: defaultVatRate }])
  }

  function handleRemoveItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function handleItemChange(index: number, field: string, value: unknown) {
    setItems(prev => {
      const next = [...prev]
      if (field === 'productId') {
        const product = products.find(p => p.id === value)
        if (product) {
          const effectiveVatRate = isVatPayer ? Number(product.vatRate ?? DEFAULT_VAT_RATE) : NON_VAT_PAYER_RATE
          next[index] = {
            ...next[index],
            productId:    value as string,
            productName:  '',
            isManual:     false,
            unit:         product.unit,
            expectedPrice: product.purchasePrice || 0,
            vatRate:      effectiveVatRate,
          }
          return next
        }
      }
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supplierId && !isManualSupplier && !isAnonymousSupplier) {
      alert('Vyberte dodavatele, zadejte ho ručně nebo zvolte anonymního dodavatele'); return
    }
    if (isManualSupplier && !isAnonymousSupplier) {
      if (!manualSupplierData.name.trim()) { alert('Vyplňte název dodavatele'); return }
    }
    if (items.length === 0) { alert('Přidejte alespoň jednu položku'); return }
    try {
      await createPurchaseOrder({
        orderNumber,
        supplierId:            isManualSupplier || isAnonymousSupplier ? null : supplierId,
        orderDate,
        expectedDate:          expectedDate || null,
        dueDate:               dueDate || null,
        paymentType:           paymentType || null,
        variableSymbol:        variableSymbol || null,
        constantSymbol:        constantSymbol || null,
        specificSymbol:        specificSymbol || null,
        note,
        isManualSupplier,
        isAnonymousSupplier,
        saveSupplierToDatabase,
        manualSupplierData:    isManualSupplier ? manualSupplierData : null,
        discountType:          discountType !== 'none' ? discountType : null,
        discountValue:         discountType !== 'none' && discountValue ? parseFloat(discountValue) : null,
        items: items.map(item => ({
          productId:     item.isManual ? null : (item.productId ?? null),
          productName:   item.isManual ? (item.productName ?? null) : null,
          isManual:      item.isManual,
          quantity:      item.quantity,
          unit:          item.unit,
          expectedPrice: item.expectedPrice,
          vatRate:       item.vatRate,
        })),
      })
      setOpen(false)
      reset()
      await onSuccess()
      alert('Objednávka vytvořena!')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Nepodařilo se vytvořit objednávku')
    }
  }

  return {
    open, orderNumber,
    orderDate, setOrderDate,
    supplierId, setSupplierId,
    expectedDate, setExpectedDate,
    note, setNote,
    items,
    dueDate, setDueDate,
    paymentType, setPaymentType,
    variableSymbol, setVariableSymbol,
    constantSymbol, setConstantSymbol,
    specificSymbol, setSpecificSymbol,
    isManualSupplier, setIsManualSupplier,
    isAnonymousSupplier, setIsAnonymousSupplier,
    saveSupplierToDatabase, setSaveSupplierToDatabase,
    manualSupplierData, setManualSupplierData,
    discountType, setDiscountType,
    discountValue, setDiscountValue,
    categoryMenuRef, hideSubmenuTimeoutRef,
    handleOpen, handleClose, handleOrderDateChange,
    handleAddItem, handleRemoveItem, handleItemChange, handleSubmit,
  }
}
