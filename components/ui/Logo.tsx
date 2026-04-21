import Link from 'next/link'

interface LogoProps {
  variant?: 'dark' | 'light'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Logo({ variant = 'dark', size = 'md', className = '' }: LogoProps) {
  const iconColor = variant === 'dark' ? 'border-[#1d1d1f]/60' : 'border-white/60'
  const textColor = variant === 'dark' ? 'text-[#1d1d1f]' : 'text-white'

  const iconSizes = {
    sm: { outer: 'w-5 h-5',   inner: 'w-2 h-2',   border: 'border-[1.5px]', innerBorder: 'border' },
    md: { outer: 'w-7 h-7',   inner: 'w-3 h-3',   border: 'border-2',       innerBorder: 'border' },
    lg: { outer: 'w-9 h-9',   inner: 'w-4 h-4',   border: 'border-2',       innerBorder: 'border' },
    xl: { outer: 'w-12 h-12', inner: 'w-5 h-5',   border: 'border-[2.5px]', innerBorder: 'border-[1.5px]' },
  }
  const textSizes = { sm: 'text-base', md: 'text-lg', lg: 'text-xl', xl: 'text-3xl' }
  const { outer, inner, border, innerBorder } = iconSizes[size]

  return (
    <Link href="/" aria-label="Weedej ERP" className={`flex items-center gap-2.5 ${className}`}>
      <div className={`relative ${outer} flex items-center justify-center rounded-full ${border} ${iconColor}`}>
        <div className={`${inner} rounded-full ${innerBorder} ${iconColor}`} />
      </div>
      <span className={`font-bold tracking-tight ${textSizes[size]} ${textColor}`}>Weedej</span>
    </Link>
  )
}
