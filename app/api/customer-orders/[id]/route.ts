// API Endpoint pro jednu objednávku zákazníka
// URL: /api/customer-orders/[id]

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/customer-orders/[id] - Získat detail objednávky
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.customerOrder.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        },
        reservations: true,
        deliveryNotes: { // ✅ Changed from deliveryNote to deliveryNotes
          include: {
            items: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Objednávka nenalezena' },
        { status: 404 }
      )
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Chyba při načítání objednávky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst objednávku' },
      { status: 500 }
    )
  }
}

// PATCH /api/customer-orders/[id] - Upravit objednávku
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status, customerName, customerEmail, customerPhone, customerAddress, note } = body

    const order = await prisma.customerOrder.update({
      where: { id: params.id },
      data: {
        status: status !== undefined ? status : undefined,
        customerName: customerName !== undefined ? customerName : undefined,
        customerEmail: customerEmail !== undefined ? customerEmail : undefined,
        customerPhone: customerPhone !== undefined ? customerPhone : undefined,
        customerAddress: customerAddress !== undefined ? customerAddress : undefined,
        note: note !== undefined ? note : undefined
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        },
        reservations: true
      }
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error('Chyba při aktualizaci objednávky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se aktualizovat objednávku' },
      { status: 500 }
    )
  }
}

// DELETE /api/customer-orders/[id] - Smazat objednávku
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Smazání objednávky automaticky smaže i položky a rezervace (Cascade)
    await prisma.customerOrder.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Objednávka smazána' })
  } catch (error) {
    console.error('Chyba při mazání objednávky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se smazat objednávku' },
      { status: 500 }
    )
  }
}
