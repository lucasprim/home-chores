import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { PrintPageClient } from './print-client'

interface PageProps {
  searchParams: Promise<{ date?: string }>
}

function getDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default async function PrintPage({ searchParams }: PageProps) {
  const params = await searchParams
  const dateStr = params.date || getDateString(new Date())

  // Fetch employees on the server
  const employees = await prisma.employee.findMany({
    where: { active: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: 'asc' },
  })

  return (
    <Suspense
      fallback={
        <div className="text-center py-8 text-[var(--muted-foreground)]">Carregando...</div>
      }
    >
      <PrintPageClient initialDate={dateStr} employees={employees} />
    </Suspense>
  )
}
