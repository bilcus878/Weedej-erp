import { type LucideIcon } from 'lucide-react'

interface Props {
  title: string
  icon?: LucideIcon
}

export function DetailSubheading({ title, icon: Icon }: Props) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5 flex items-center gap-1.5">
      {Icon && <Icon className="w-3 h-3" />}
      {title}
    </p>
  )
}
