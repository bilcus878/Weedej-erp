import { FileText, FileSpreadsheet, Archive, Code2 } from 'lucide-react'
import type { DocTypeOption, FormatOption } from './types'

export const DOC_TYPES: DocTypeOption[] = [
  { id: 'issued_invoice',   label: 'Vydané faktury',       description: 'Faktury vystavené odběratelům' },
  { id: 'received_invoice', label: 'Přijaté faktury',      description: 'Faktury přijaté od dodavatelů' },
  { id: 'credit_note',      label: 'Dobropisy',            description: 'Dobropisy k vydaným fakturám' },
  { id: 'payment',          label: 'Platby / transakce',   description: 'Hotovostní i bezhotovostní platby' },
  { id: 'customer_order',   label: 'Objednávky zákazníků', description: 'Přijaté objednávky' },
  { id: 'delivery_note',    label: 'Výdejky',              description: 'Výdejky ze skladu' },
  { id: 'receipt',          label: 'Příjemky',             description: 'Příjemky na sklad' },
  { id: 'stock_movement',   label: 'Pohyby skladu',        description: 'Všechny skladové pohyby' },
]

export const FORMATS: FormatOption[] = [
  {
    id:          'csv',
    label:       'CSV',
    description: 'Jeden soubor, vhodný pro rychlý import',
    icon:        <FileText className="w-5 h-5" />,
  },
  {
    id:          'xlsx',
    label:       'Excel (XLSX)',
    description: 'Vícelistový sešit s DPH přehledem a barevným formátováním',
    icon:        <FileSpreadsheet className="w-5 h-5" />,
    badge:       'Doporučeno',
    badgeColor:  'bg-violet-100 text-violet-700',
  },
  {
    id:          'zip',
    label:       'ZIP balíček',
    description: 'CSV + XLSX + PDF originály dokladů v jednom archivu',
    icon:        <Archive className="w-5 h-5" />,
    badge:       'Kompletní',
    badgeColor:  'bg-emerald-100 text-emerald-700',
  },
  {
    id:          'pohoda_xml',
    label:       'Pohoda XML',
    description: 'Přímý import do Pohoda MDB / SQL / E1',
    icon:        <Code2 className="w-5 h-5" />,
    badge:       'Pohoda',
    badgeColor:  'bg-blue-100 text-blue-700',
  },
  {
    id:          'money_xml',
    label:       'Money S3 XML',
    description: 'Přímý import do Money S3 / S4 (Solitea)',
    icon:        <Code2 className="w-5 h-5" />,
    badge:       'Money S3',
    badgeColor:  'bg-orange-100 text-orange-700',
  },
  {
    id:          'generic_csv',
    label:       'Obecné CSV',
    description: 'Středníkový oddělovač, pro Helios, Abra a jiné SW',
    icon:        <FileText className="w-5 h-5" />,
  },
]
