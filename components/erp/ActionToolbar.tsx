import { ReactNode } from 'react'

interface Props {
  left?: ReactNode
  right?: ReactNode
}

export function ActionToolbar({ left, right }: Props) {
  return (
    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
      <div className="flex gap-2">{left}</div>
      <div className="flex flex-wrap gap-2 justify-end">{right}</div>
    </div>
  )
}
