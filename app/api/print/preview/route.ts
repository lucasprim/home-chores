import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isTaskScheduledForDate } from '@/lib/rrule-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'DAILY_TASKS'
    const dateParam = searchParams.get('date')
    const employeeId = searchParams.get('employeeId')

    if (!dateParam) {
      return NextResponse.json({ error: 'Data é obrigatória' }, { status: 400 })
    }

    const date = new Date(dateParam)
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
    }

    // Get settings
    const houseNameRecord = await prisma.settings.findUnique({ where: { key: 'house_name' } })
    const houseName = houseNameRecord?.value ?? 'Minha Casa'

    if (type === 'DAILY_TASKS') {
      // Get all active tasks
      const tasks = await prisma.task.findMany({
        where: {
          active: true,
          ...(employeeId && { employeeId }),
        },
        include: {
          employee: {
            select: { id: true, name: true, role: true, workDays: true },
          },
        },
      })

      // Filter tasks scheduled for this date
      const dayOfWeek = date.getDay()
      const scheduledTasks = tasks.filter((task) => {
        if (!isTaskScheduledForDate(task.rrule, date)) return false
        if (task.employee && !task.employee.workDays.includes(dayOfWeek)) return false
        return true
      })

      // Group by employee
      const groups: Record<
        string,
        {
          employee: { name: string; role: string } | null
          tasks: { title: string; description: string | null }[]
        }
      > = {}

      for (const task of scheduledTasks) {
        const key = task.employee?.id ?? 'unassigned'
        if (!groups[key]) {
          groups[key] = {
            employee: task.employee ? { name: task.employee.name, role: task.employee.role } : null,
            tasks: [],
          }
        }
        groups[key].tasks.push({
          title: task.title,
          description: task.description,
        })
      }

      const dateStr = date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })

      return NextResponse.json({
        type: 'DAILY_TASKS',
        houseName,
        date: dateStr,
        groups: Object.values(groups),
        totalTasks: scheduledTasks.length,
      })
    }

    if (type === 'WEEKLY_MENU') {
      // Get week start (Monday)
      const weekStart = new Date(date)
      const day = weekStart.getDay()
      const diff = day === 0 ? -6 : 1 - day
      weekStart.setDate(weekStart.getDate() + diff)

      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      // Get meal schedules for the week
      const schedules = await prisma.mealSchedule.findMany({
        where: {
          date: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
        include: {
          dish: { select: { name: true } },
        },
        orderBy: { date: 'asc' },
      })

      const days = []
      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(weekStart)
        dayDate.setDate(dayDate.getDate() + i)
        const dayStr = dayDate.toISOString().split('T')[0]

        const daySchedules = schedules.filter(
          (s) => s.date.toISOString().split('T')[0] === dayStr
        )

        days.push({
          date: dayDate.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
          }),
          lunch: daySchedules.find((s) => s.mealType === 'ALMOCO')?.dish.name ?? null,
          dinner: daySchedules.find((s) => s.mealType === 'JANTAR')?.dish.name ?? null,
        })
      }

      const periodStr = `${weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${weekEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`

      return NextResponse.json({
        type: 'WEEKLY_MENU',
        houseName,
        period: periodStr,
        days,
      })
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Erro ao gerar preview' }, { status: 500 })
  }
}
