// Prisma Client - singleton instance
// Tohle zajišťuje že máme pouze jednu instanci Prisma klienta

import { PrismaClient } from '@prisma/client'

// Vytvoř globální proměnnou pro Prisma (aby to fungovalo v development režimu)
const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Export Prisma klienta
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  })

// V development režimu ulož Prisma klienta do globální proměnné
// (aby se nevytvářelo zbytečně moc instancí při hot reload)
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
