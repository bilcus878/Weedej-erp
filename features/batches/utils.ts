export function fmt(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('cs-CZ')
}

export function fmtNum(n: number): string {
  return n.toLocaleString('cs-CZ', { maximumFractionDigits: 2 })
}

export function getDaysLeft(expiryDate: string | null): number | null {
  if (!expiryDate) return null
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export function isExpiringSoon(expiryDate: string | null): boolean {
  if (!expiryDate) return false
  const days = (new Date(expiryDate).getTime() - Date.now()) / 86_400_000
  return days >= 0 && days <= 30
}

export function isExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false
  return new Date(expiryDate).getTime() < Date.now()
}
