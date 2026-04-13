// Eshop objednávky
// URL: /eshop-orders

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Globe } from 'lucide-react'

export default function EshopOrdersPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Eshop objednávky</h1>
        <p className="text-gray-500 mt-1">Objednávky z e-shopu</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Připravujeme
          </CardTitle>
          <Globe className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Eshop objednávky budou brzy k dispozici. Číslování: ESHYYYYXXXX</p>
        </CardContent>
      </Card>
    </div>
  )
}
