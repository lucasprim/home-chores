import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Home Chores',
  description: 'Gerenciamento de tarefas domésticas',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
