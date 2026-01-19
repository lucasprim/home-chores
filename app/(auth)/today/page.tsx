import { Suspense } from 'react'
import {
  getTasksForDate,
  getTasksForWeek,
  TasksForDateResult,
  TasksForWeekResult,
} from '@/lib/task-scheduler'
import { TodayPageClient } from './today-client'

function getDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface PageProps {
  searchParams: Promise<{ date?: string; view?: string }>
}

export default async function TodayPage({ searchParams }: PageProps) {
  const params = await searchParams
  const dateStr = params.date || getDateString(new Date())
  const viewMode = params.view === 'weekly' ? 'weekly' : 'daily'

  // Fetch initial data on the server using unified engine
  const [dailyData, weeklyData] = await Promise.all([
    viewMode === 'daily' ? getTasksForDate(dateStr) : null,
    viewMode === 'weekly' ? getTasksForWeek(dateStr) : null,
  ])

  return (
    <Suspense
      fallback={
        <div className="text-center py-8 text-[var(--muted-foreground)]">Carregando...</div>
      }
    >
      <TodayPageClient
        initialDate={dateStr}
        initialView={viewMode}
        initialDailyData={dailyData}
        initialWeeklyData={weeklyData}
      />
    </Suspense>
  )
}
