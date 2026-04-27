'use client'

import { X, Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface PartyFormData {
  name:        string
  entityType:  string
  contact:     string
  email:       string
  phone:       string
  website:     string
  ico:         string
  dic:         string
  bankAccount: string
  address:     string
  note:        string
}

export interface PartyFormConfig {
  titleNew:               string
  titleEdit:              string
  submitNew:              string
  nameLabelCompany:       string
  namePlaceholderCompany: string
  emailPlaceholder:       string
  headerIcon:             LucideIcon
  accentColor:            'emerald' | 'blue'
}

interface Props {
  open:         boolean
  onClose:      () => void
  config:       PartyFormConfig
  isEditing:    boolean
  formData:     PartyFormData
  onChange:     (field: keyof PartyFormData, value: string) => void
  onSubmit:     (e: React.FormEvent) => Promise<void>
  isSubmitting: boolean
  errorMessage: string | null
}

const ACCENT = {
  emerald: {
    iconBg:    'bg-emerald-100',
    iconTxt:   'text-emerald-600',
    btn:       'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
    selBorder: 'border-emerald-400',
    selBg:     'bg-emerald-50',
    selTxt:    'text-emerald-700',
    selDot:    'bg-emerald-500',
    ring:      'focus:ring-emerald-400',
  },
  blue: {
    iconBg:    'bg-blue-100',
    iconTxt:   'text-blue-600',
    btn:       'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    selBorder: 'border-blue-400',
    selBg:     'bg-blue-50',
    selTxt:    'text-blue-700',
    selDot:    'bg-blue-500',
    ring:      'focus:ring-blue-400',
  },
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  )
}

function Field({
  label, required, className, children,
}: {
  label: string; required?: boolean; className?: string; children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const baseInp =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent bg-white'

export function PartyFormModal({
  open, onClose, config, isEditing, formData, onChange, onSubmit, isSubmitting, errorMessage,
}: Props) {
  if (!open) return null

  const a         = ACCENT[config.accentColor]
  const Icon      = config.headerIcon
  const isCompany = formData.entityType === 'company'
  const inp       = `${baseInp} ${a.ring}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${a.iconBg}`}>
            <Icon className={`w-5 h-5 ${a.iconTxt}`} />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 flex-1">
            {isEditing ? config.titleEdit : config.titleNew}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form id="party-form" onSubmit={onSubmit} className="space-y-6">

            {/* 1. Základní údaje */}
            <section>
              <SectionLabel>Základní údaje</SectionLabel>
              <div className="space-y-4">
                {/* Entity type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Typ subjektu</label>
                  <div className="flex gap-3">
                    {(['company', 'individual'] as const).map(type => {
                      const selected = formData.entityType === type
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => onChange('entityType', type)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                            selected
                              ? `${a.selBorder} ${a.selBg} ${a.selTxt}`
                              : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
                          }`}
                        >
                          {selected && (
                            <span className={`w-2 h-2 rounded-full shrink-0 ${a.selDot}`} />
                          )}
                          {type === 'company' ? 'Firma' : 'Fyzická osoba'}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Name + Contact */}
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label={isCompany ? config.nameLabelCompany : 'Jméno a příjmení'}
                    required
                    className={isCompany ? '' : 'col-span-2'}
                  >
                    <input
                      className={inp}
                      value={formData.name}
                      onChange={e => onChange('name', e.target.value)}
                      placeholder={isCompany ? config.namePlaceholderCompany : 'Jan Novák'}
                      required
                    />
                  </Field>
                  {isCompany && (
                    <Field label="Kontaktní osoba">
                      <input
                        className={inp}
                        value={formData.contact}
                        onChange={e => onChange('contact', e.target.value)}
                        placeholder="Jan Novák"
                      />
                    </Field>
                  )}
                </div>
              </div>
            </section>

            {/* 2. Kontaktní a adresní údaje */}
            <section>
              <SectionLabel>Kontaktní a adresní údaje</SectionLabel>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Email">
                  <input
                    type="email"
                    className={inp}
                    value={formData.email}
                    onChange={e => onChange('email', e.target.value)}
                    placeholder={config.emailPlaceholder}
                  />
                </Field>
                <Field label="Telefon">
                  <input
                    type="tel"
                    className={inp}
                    value={formData.phone}
                    onChange={e => onChange('phone', e.target.value)}
                    placeholder="+420 123 456 789"
                  />
                </Field>
                {isCompany && (
                  <Field label="Web">
                    <input
                      className={inp}
                      value={formData.website}
                      onChange={e => onChange('website', e.target.value)}
                      placeholder="https://www.firma.cz"
                    />
                  </Field>
                )}
                <Field label="Adresa" className={isCompany ? '' : 'col-span-2'}>
                  <input
                    className={inp}
                    value={formData.address}
                    onChange={e => onChange('address', e.target.value)}
                    placeholder="Ulice 123, 110 00 Praha 1"
                  />
                </Field>
              </div>
            </section>

            {/* 3. Daňové a finanční údaje */}
            <section>
              <SectionLabel>Daňové a finanční údaje</SectionLabel>
              <div className="grid grid-cols-2 gap-4">
                {isCompany && (
                  <Field label="IČO">
                    <input
                      className={inp}
                      value={formData.ico}
                      onChange={e => onChange('ico', e.target.value)}
                      placeholder="12345678"
                    />
                  </Field>
                )}
                {isCompany && (
                  <Field label="DIČ">
                    <input
                      className={inp}
                      value={formData.dic}
                      onChange={e => onChange('dic', e.target.value)}
                      placeholder="CZ12345678"
                    />
                  </Field>
                )}
                <Field label="Číslo účtu" className={isCompany ? '' : 'col-span-2'}>
                  <input
                    className={inp}
                    value={formData.bankAccount}
                    onChange={e => onChange('bankAccount', e.target.value)}
                    placeholder="123456789/0100"
                  />
                </Field>
              </div>
            </section>

            {/* 4. Interní poznámka */}
            <section>
              <SectionLabel>Interní poznámka</SectionLabel>
              <textarea
                className={`${inp} min-h-[72px] resize-none`}
                value={formData.note}
                onChange={e => onChange('note', e.target.value)}
                placeholder="Volitelná poznámka..."
              />
            </section>

          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 shrink-0 rounded-b-2xl">
          <div className="min-h-[20px]">
            {errorMessage && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Zrušit
            </button>
            <button
              type="submit"
              form="party-form"
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 flex items-center gap-2 disabled:opacity-60 ${a.btn}`}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Uložit změny' : config.submitNew}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
