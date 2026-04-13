// Vytvoří prvního administrátora ERP systému
// Spusť: node scripts/create-admin.mjs
// Nebo: node scripts/create-admin.mjs "jmeno@email.cz" "HesloSemDej123"

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Načti .env ručně (bez dotenv balíčku)
try {
  const env = readFileSync(resolve(process.cwd(), '.env'), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
} catch {}

const prisma = new PrismaClient()

const email = process.argv[2] ?? 'admin@firma.cz'
const password = process.argv[3] ?? 'Admin123!'
const name = process.argv[4] ?? 'Administrátor'

const existing = await prisma.user.findUnique({ where: { email } })
if (existing) {
  console.log(`Uživatel ${email} již existuje.`)
  await prisma.$disconnect()
  process.exit(0)
}

const hash = await bcrypt.hash(password, 12)
const user = await prisma.user.create({
  data: { email, name, passwordHash: hash, isActive: true },
})

console.log('✓ Admin vytvořen:')
console.log(`  Email: ${user.email}`)
console.log(`  Heslo: ${password}`)
console.log(`  ⚠  Změňte heslo po prvním přihlášení!`)

await prisma.$disconnect()
