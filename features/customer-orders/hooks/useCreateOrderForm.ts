'use client'

import { useRef, useState } from 'react'
import { DEFAULT_VAT_RATE, NON_VAT_PAYER_RATE } from '@/lib/vatCalculation'
import { fetchNextOrderNumber, createCustomerOrder } from '../services/customerOrderService'
import type { CustomerOrderItem, ManualCustomerData, Product } from '../types'

const EMPTY_MANUAL_CUSTOMER: ManualCustomerData = {
  name: '', entityType: 'company', contactPerson: '', email: '', phone: '',
  ico: '', dic: '', bankAccount: '', website: '', address: '', note: '',
}

export function useCreateOrderForm(
  products:  Product[],
  isVatPayer: boolean,
  onSuccess:  () => Promise<void>,
) {
  const [open,                   setOpen]                   = useState(false)
  const [orderNumber,            setOrderNumber]            = useState('')
  const [orderDate,              setOrderDate]              = useState(() => new Date().toISOString().split('T')[0])
  const [customerId,             setCustomerId]             = useState('')
  const [customerName,           setCustomerName]           = useState('')
  const [customerEmail,          setCustomerEmail]          = useState('')
  const [customerPhone,          setCustomerPhone]          = useState('')
  const [customerAddress,        setCustomerAddress]        = useState('')
  const [note,                   setNote]                   = useState('')
  const [items,                  setItems]                  = useState<CustomerOrderItem[]>([])
  const [dueDate,                setDueDate]                = useState(() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0] })
  const [paymentType,            setPaymentType]            = useState('')
  const [variableSymbol,         setVariableSymbol]         = useState('')
  const [constantSymbol,         setConstantSymbol]         = useState('')
  const [specificSymbol,         setSpecificSymbol]         = useState('')
  const [isManualCustomer,       setIsManualCustomer]       = useState(false)
  const [isAnonymousCustomer,    setIsAnonymousCustomer]    = useState(false)
  const [saveCustomerToDatabase, setSaveCustomerToDatabase] = useState(false)
  const [manualCustomerData,     setManualCustomerData]     = useState<ManualCustomerData>({ ...EMPTY_MANUAL_CUSTOMER })
  const [discountType,           setDiscountType]           = useState<'percentage' | 'fixed' | 'none'>('none')
  const [discountValue,          setDiscountValue]          = useState('')

  const categoryMenuRef       = useRef<HTMLDivElement>(null)
  const hideSubmenuTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  function reset() {
    setOrderDate(new Date().toISOString().split('T')[0])
    setOrderNumber('')
    setCustomerId(''); setCustomerName(''); setCustomerEmail(''); setCustomerPhone(''); setCustomerAddress('')
    setNote(''); setItems([])
    const d = new Date(); d.setDate(d.getDate() + 14); setDueDate(d.toISOString().split('T')[0])
    setPaymentType(''); setVariableSymbol(''); setConstantSymbol(''); setSpecificSymbol('')
    setIsManualCustomer(false); setIsAnonymousCustomer(false); setSaveCustomerToDatabase(false)
    setManualCustomerData({ ...EMPTY_MANUAL_CUSTOMER })
    setDiscountType('none'); setDiscountValue('')
  }

  async function handleOpen() {
    const number         = await fetchNextOrderNumber()
    const defaultVatRate = isVatPayer ? DEFAULT_VAT_RATE : NON_VAT_PAYER_RATE
    setOrderNumber(number)
    setItems([{ productId: '', productName: '', quantity: 1, unit: 'ks', price: 0, vatRate: defaultVatRate }])
    setOpen(true)
  }

  function handleClose() { setOpen(false); reset() }

  function handleAddItem() {
    const defaultVatRate = isVatPayer ? DEFAULT_VAT_RATE : NON_VAT_PAYER_RATE
    setItems(prev => [...prev, { productId: '', productName: '', quantity: 1, unit: 'ks', price: 0, vatRate: defaultVatRate }])
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
          const effectiveVatRate = isVatPayer ? Number(product.vatRate) : NON_VAT_PAYER_RATE
          next[index] = { ...next[index], productId: value as string, productName: '', unit: product.unit, price: Number(product.price), vatRate: effectiveVatRate }
        }
      } else {
        next[index] = { ...next[index], [field]: value }
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId && !isManualCustomer && !isAnonymousCustomer) {
      alert('Vyberte zákazníka, zadejte ho ručně nebo zvolte anonymního zákazníka'); return
    }
    if (isManualCustomer && !isAnonymousCustomer) {
      if (!manualCustomerData.name.trim())    { alert('Vyplňte název zákazníka'); return }
      if (!manualCustomerData.address.trim()) { alert('Vyplňte adresu zákazníka'); return }
    }
    if (!dueDate)       { alert('Zadejte datum splatnosti'); return }
    if (!paymentType)   { alert('Vyberte formu úhrady'); return }
    if (items.length === 0) { alert('Přidejte alespoň jednu položku'); return }
    try {
      await createCustomerOrder({
        orderDate,
        customerId: isManualCustomer || isAnonymousCustomer ? null : customerId,
        customerName, customerEmail, customerPhone, customerAddress, note,
        dueDate, paymentType,
        variableSymbol:  variableSymbol  || null,
        constantSymbol:  constantSymbol  || null,
        specificSymbol:  specificSymbol  || null,
        isManualCustomer, isAnonymousCustomer, saveCustomerToDatabase,
        manualCustomerData: isManualCustomer ? manualCustomerData : null,
        discountType:  discountType !== 'none' ? discountType : null,
        discountValue: discountType !== 'none' && discountValue ? parseFloat(discountValue) : null,
        items: items.map(item => ({
          productId:   item.productId   || null,
          productName: item.productName || null,
          quantity:    item.quantity,
          unit:        item.unit,
          price:       item.price,
          vatRate:     item.vatRate,
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
    customerId, setCustomerId,
    customerName, setCustomerName,
    customerEmail, setCustomerEmail,
    customerPhone, setCustomerPhone,
    customerAddress, setCustomerAddress,
    note, setNote,
    items,
    dueDate, setDueDate,
    paymentType, setPaymentType,
    variableSymbol, setVariableSymbol,
    constantSymbol, setConstantSymbol,
    specificSymbol, setSpecificSymbol,
    isManualCustomer, setIsManualCustomer,
    isAnonymousCustomer, setIsAnonymousCustomer,
    saveCustomerToDatabase, setSaveCustomerToDatabase,
    manualCustomerData, setManualCustomerData,
    discountType, setDiscountType,
    discountValue, setDiscountValue,
    categoryMenuRef, hideSubmenuTimeoutRef,
    handleOpen, handleClose, handleAddItem, handleRemoveItem, handleItemChange, handleSubmit,
  }
}
