'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavLinkProps {
  href: string
  icon: string
  label: string
}

export function NavLink({ href, icon, label }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${
        isActive
          ? 'text-[var(--primary)] bg-[var(--primary)]/10'
          : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  )
}
