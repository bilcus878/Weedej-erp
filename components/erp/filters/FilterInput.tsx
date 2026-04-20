interface Props {
  value:       string
  onChange:    (v: string) => void
  placeholder?: string
  type?:       'text' | 'number' | 'date'
  className?:  string
}

export function FilterInput({ value, onChange, placeholder, type = 'text', className = '' }: Props) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${type !== 'text' ? 'text-center' : ''} ${className}`}
    />
  )
}
