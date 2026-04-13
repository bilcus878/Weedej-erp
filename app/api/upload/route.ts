// API Endpoint pro nahrání souborů (fotky faktur)
// URL: http://localhost:3000/api/upload

import { NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Nebyl nahrán žádný soubor' },
        { status: 400 }
      )
    }

    // Zkontroluj typ souboru (obrázky nebo PDF)
    const allowedTypes = ['image/', 'application/pdf']
    const isAllowed = allowedTypes.some(type => file.type.startsWith(type))

    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Soubor musí být obrázek nebo PDF' },
        { status: 400 }
      )
    }

    // Zkontroluj velikost (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Soubor je příliš velký. Maximum je 5MB.' },
        { status: 400 }
      )
    }

    // Vytvoř unikátní název souboru
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const filename = `invoice_${timestamp}.${extension}`

    // Převeď soubor na buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Ulož soubor do public/uploads/invoices
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'invoices')
    const filepath = path.join(uploadDir, filename)

    await writeFile(filepath, buffer)

    // Vrať URL k souboru (relativní cesta od public)
    const url = `/uploads/invoices/${filename}`

    return NextResponse.json({ url }, { status: 201 })
  } catch (error) {
    console.error('Chyba při nahrávání souboru:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se nahrát soubor' },
      { status: 500 }
    )
  }
}
