import Link from 'next/link'
import { NavLink } from '@/components/nav-link'
import { LogoutButton } from '@/components/logout-button'

const navItems = [
  { href: '/today', label: 'Hoje', icon: '📋' },
  { href: '/tasks', label: 'Tarefas', icon: '✅' },
  { href: '/menu', label: 'Cardápio', icon: '🍽️' },
  { href: '/print', label: 'Imprimir', icon: '🖨️' },
  { href: '/employees', label: 'Funcionários', icon: '👥' },
  { href: '/settings', label: 'Configurações', icon: '⚙️' },
]

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-3 flex items-center justify-between">
        <Link href="/today" className="text-xl font-bold">
          Home Chores
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/settings" className="text-xl" title="Configurações">
            ⚙️
          </Link>
          <LogoutButton />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 pb-20">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[var(--background)] border-t border-[var(--border)] px-2 py-1 safe-area-pb">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          {navItems.slice(0, 5).map(item => (
            <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
          ))}
        </div>
      </nav>
    </div>
  )
}
