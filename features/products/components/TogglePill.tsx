'use client'

interface TogglePillProps {
  active:        boolean
  onChange:      (v: boolean) => void
  label:         string
  icon:          React.ReactNode
  activeClass:   string
  inactiveClass: string
}

export function TogglePill({ active, onChange, label, icon, activeClass, inactiveClass }: TogglePillProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all select-none ${active ? activeClass : inactiveClass}`}
    >
      {icon}
      {label}
    </button>
  )
}
