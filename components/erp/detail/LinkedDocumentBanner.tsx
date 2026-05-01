import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

interface DocumentLink {
  label: string
  value: string
  href: string
}

interface Props {
  links: DocumentLink[]
  color?: 'blue' | 'purple'
}

export function LinkedDocumentBanner({ links, color = 'blue' }: Props) {
  const bg = color === 'purple' ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'
  const linkColor = color === 'purple' ? 'text-purple-700 hover:text-purple-900' : 'text-blue-600 hover:text-blue-800'

  return (
    <div className={`p-3 ${bg} border rounded-lg`}>
      <div className="text-sm text-center">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {links.map((link, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-gray-600">{link.label}: </span>
              <Link
                href={link.href}
                className={`${linkColor} hover:underline font-medium flex items-center gap-0.5`}
                onClick={e => e.stopPropagation()}
              >
                {link.value}
                <ExternalLink className="w-3 h-3 inline ml-0.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
