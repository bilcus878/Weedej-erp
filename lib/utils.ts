// Utility funkce - pomocné funkce které budeme používat všude

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Sloučení Tailwind tříd (aby nám nečmoudily duplicitní styly)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formátování ceny (např. 1234.5 -> "1 234,50 Kč")
export function formatPrice(price: number | string): string {
  const num = typeof price === 'string' ? parseFloat(price) : price
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
  }).format(num)
}

// Formátování data (např. 2024-05-20 -> "20. 5. 2024")
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).format(d)
}

// Formátování data + času
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

// Formátování množství (např. 1500g -> "1.50 kg", 1500ml -> "1.50 l", 5ks -> "5 ks")
export function formatQuantity(quantity: number | string, unit: string): string {
  const num = typeof quantity === 'string' ? parseFloat(quantity) : quantity

  if (unit === 'g' && num >= 1000) {
    return `${(num / 1000).toFixed(2)} kg`
  }

  if (unit === 'ml' && num >= 1000) {
    return `${(num / 1000).toFixed(2)} l`
  }

  return `${num} ${unit}`
}
