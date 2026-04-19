'use strict'
const { execSync } = require('child_process')

const BASELINE = [
  '20260417_delivery_note_prices_sumup_variant',
  '20260418_reservation_variant_fields',
  '20260418_variant_fulfillment',
]

for (const name of BASELINE) {
  try {
    execSync(`npx prisma migrate resolve --applied ${name}`, { stdio: 'pipe' })
    console.log(`✓ baselined: ${name}`)
  } catch {
    console.log(`↷ already tracked: ${name}`)
  }
}
