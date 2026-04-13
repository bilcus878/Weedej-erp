// Setup STORNO systému a ON-COMMIT číslování
// Spustí SQL příkazy pro vytvoření DocumentSeries tabulky a přidání storno polí

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Instaluji STORNO systém a ON-COMMIT číslování...\n')

  try {
    // Načti SQL soubor
    const sqlPath = path.join(__dirname, '..', 'setup-storno-system.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8')

    // Rozděl SQL příkazy (každý končí středníkem)
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))

    // Spusť každý příkaz
    for (const command of commands) {
      if (command.includes('SELECT')) {
        // SELECT příkazy vypíšeme
        const result = await prisma.$queryRawUnsafe(command)
        console.log(result)
      } else {
        // Ostatní příkazy jen spustíme
        await prisma.$executeRawUnsafe(command)
      }
    }

    console.log('\n✅ STORNO systém úspěšně nainstalován!')
    console.log('\nCo bylo provedeno:')
    console.log('  ✓ Vytvořena tabulka DocumentSeries')
    console.log('  ✓ Přidány storno sloupce do Receipt')
    console.log('  ✓ Přidány storno sloupce do DeliveryNote')
    console.log('  ✓ Smazána stará DocumentNumber tabulka')
    console.log('\n🎯 Aplikace je nyní připravena!')
    console.log('   - Číslování: ON-COMMIT (bez mezer)')
    console.log('   - Storno: Připraveno pro příjemky a výdejky')
    console.log('   - Reset DB: Tlačítko v Nastavení')

  } catch (error) {
    console.error('\n❌ Chyba při instalaci:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
