import { Suspense } from 'react'
import { getTasksForDate, TasksForDateResult } from '@/lib/tasks-for-date'
import { prisma } from '@/lib/prisma'
import { TaskType } from '@prisma/client'
import { getScheduledWeekdays } from '@/lib/rrule-utils'
import { TodayPageClient, WeeklyScheduleResponse } from './today-client'

function getDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function getWeeklySchedule(dateStr: string): Promise<WeeklyScheduleResponse> {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year!, month! - 1, day!, 12, 0, 0)

  // Get week start (Monday)
  const weekStart = new Date(date)
  const dayNum = weekStart.getDay()
  const diff = dayNum === 0 ? -6 : 1 - dayNum
  weekStart.setDate(weekStart.getDate() + diff)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  // Run queries in parallel
  const [employees, recurringTasks] = await Promise.all([
    prisma.employee.findMany({
      where: { active: true },
      select: { id: true, name: true, role: true, workDays: true },
      orderBy: { name: 'asc' },
    }),
    prisma.task.findMany({
      where: { active: true, taskType: TaskType.RECURRING },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        employeeId: true,
        rrule: true,
        startDate: true,
      },
    }),
  ])

  // Build schedule for each employee
  const employeeSchedules = employees.map((emp) => {
    const empTasks = recurringTasks.filter((t) => t.employeeId === emp.id)
    const days = []

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStart)
      dayDate.setDate(dayDate.getDate() + i)
      const dow = dayDate.getDay()

      const worksToday = emp.workDays.includes(dow)
      const tasksForDay = worksToday
        ? empTasks.filter((task) => {
            if (!task.rrule) return false
            const scheduledDays = getScheduledWeekdays(task.rrule, weekStart, task.startDate)
            return scheduledDays.includes(dow)
          })
        : []

      days.push({
        date: getDateString(dayDate),
        dayOfWeek: dow,
        tasks: tasksForDay.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          category: t.category,
        })),
      })
    }

    return {
      id: emp.id,
      name: emp.name,
      role: emp.role,
      workDays: emp.workDays,
      days,
    }
  })

  // Unassigned tasks
  const unassignedTasks = recurringTasks.filter((t) => !t.employeeId)
  const unassignedDays = []
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(weekStart)
    dayDate.setDate(dayDate.getDate() + i)
    const dow = dayDate.getDay()

    const tasksForDay = unassignedTasks.filter((task) => {
      if (!task.rrule) return false
      const scheduledDays = getScheduledWeekdays(task.rrule, weekStart, task.startDate)
      return scheduledDays.includes(dow)
    })

    unassignedDays.push({
      date: getDateString(dayDate),
      dayOfWeek: dow,
      tasks: tasksForDay.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        category: t.category,
      })),
    })
  }

  const hasUnassignedTasks = unassignedDays.some((d) => d.tasks.length > 0)

  return {
    weekStart: getDateString(weekStart),
    weekEnd: getDateString(weekEnd),
    employees: employeeSchedules,
    unassigned: hasUnassignedTasks
      ? {
          id: 'unassigned',
          name: 'Sem atribuição',
          role: 'OUTRO' as const,
          workDays: [0, 1, 2, 3, 4, 5, 6],
          days: unassignedDays,
        }
      : null,
  }
}

interface PageProps {
  searchParams: Promise<{ date?: string; view?: string }>
}

export default async function TodayPage({ searchParams }: PageProps) {
  const params = await searchParams
  const dateStr = params.date || getDateString(new Date())
  const viewMode = params.view === 'weekly' ? 'weekly' : 'daily'

  // Fetch initial data on the server
  const [dailyData, weeklyData] = await Promise.all([
    viewMode === 'daily' ? getTasksForDate(dateStr) : null,
    viewMode === 'weekly' ? getWeeklySchedule(dateStr) : null,
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
