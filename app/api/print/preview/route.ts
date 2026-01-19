import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTasksForDate } from '@/lib/task-scheduler'

const ROLE_LABELS: Record<string, string> = {
  FAXINEIRA: 'Faxineira',
  COZINHEIRA: 'Cozinheira',
  BABA: 'Babá',
  JARDINEIRO: 'Jardineiro',
  MOTORISTA: 'Motorista',
  OUTRO: 'Outro',
}

export type PreviewPage =
  | {
      type: 'UNASSIGNED_TASKS'
      title: string
      tasks: { title: string; description: string | null }[]
    }
  | {
      type: 'EMPLOYEE_TASKS'
      title: string
      employee: { name: string; role: string }
      tasks: { title: string; description: string | null }[]
    }
  | {
      type: 'MENU'
      title: string
      lunch?: string
      dinner?: string
    }
  | {
      type: 'SPECIAL_TASK'
      title: string
      task: {
        title: string
        description: string | null
        dueDate: string
        daysRemaining: number
        category: string
        employee: { name: string; role: string } | null
      }
    }

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'DAILY_TASKS'
    const dateParam = searchParams.get('date')
    const employeeId = searchParams.get('employeeId')
    const includeSpecialTasks = searchParams.get('includeSpecialTasks') !== 'false'

    if (!dateParam) {
      return NextResponse.json({ error: 'Data é obrigatória' }, { status: 400 })
    }

    // Validate date format
    const [year, month, day] = dateParam.split('-').map(Number)
    if (!year || !month || !day) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
    }
    const date = new Date(year, month - 1, day, 12, 0, 0)
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
    }

    if (type === 'DAILY_TASKS') {
      const dateStr = date.toISOString().split('T')[0]!

      // Get tasks using unified engine and meals in parallel
      const [taskResult, houseNameRecord, meals] = await Promise.all([
        getTasksForDate(dateParam, {
          employeeId: employeeId || undefined,
          includeSpecialTasks,
        }),
        prisma.settings.findUnique({ where: { key: 'house_name' } }),
        prisma.mealSchedule.findMany({
          where: {
            date: {
              gte: new Date(dateStr),
              lt: new Date(new Date(dateStr).getTime() + 24 * 60 * 60 * 1000),
            },
          },
          select: { mealType: true, dish: { select: { name: true } } },
        }),
      ])

      const houseName = houseNameRecord?.value ?? 'Minha Casa'
      const lunch = meals.find((m) => m.mealType === 'ALMOCO')?.dish.name
      const dinner = meals.find((m) => m.mealType === 'JANTAR')?.dish.name

      // Build pages array
      const pages: PreviewPage[] = []

      // Group recurring tasks by employee
      const unassignedTasks: { title: string; description: string | null }[] = []
      const employeeGroups: Record<
        string,
        {
          name: string
          role: string
          tasks: { title: string; description: string | null }[]
        }
      > = {}

      for (const task of taskResult.tasks) {
        if (!task.employee) {
          unassignedTasks.push({
            title: task.title,
            description: task.description,
          })
        } else {
          const key = task.employee.id
          if (!employeeGroups[key]) {
            employeeGroups[key] = {
              name: task.employee.name,
              role: ROLE_LABELS[task.employee.role] || task.employee.role,
              tasks: [],
            }
          }
          employeeGroups[key].tasks.push({
            title: task.title,
            description: task.description,
          })
        }
      }

      // Page 1: Unassigned tasks (if any)
      if (unassignedTasks.length > 0) {
        pages.push({
          type: 'UNASSIGNED_TASKS',
          title: 'Tarefas Gerais',
          tasks: unassignedTasks,
        })
      }

      // Pages: One per employee
      for (const group of Object.values(employeeGroups)) {
        pages.push({
          type: 'EMPLOYEE_TASKS',
          title: group.name,
          employee: { name: group.name, role: group.role },
          tasks: group.tasks,
        })
      }

      // Page: Menu (if meals exist)
      if (lunch || dinner) {
        pages.push({
          type: 'MENU',
          title: 'Cardápio do Dia',
          lunch,
          dinner,
        })
      }

      // Pages: One per special task
      const normalizedDate = new Date(date)
      normalizedDate.setHours(0, 0, 0, 0)

      for (const task of taskResult.specialTasks) {
        const taskDueDate = new Date(task.dueDate)
        taskDueDate.setHours(0, 0, 0, 0)
        const daysRemaining = Math.ceil(
          (taskDueDate.getTime() - normalizedDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        pages.push({
          type: 'SPECIAL_TASK',
          title: 'Tarefa Especial',
          task: {
            title: task.title,
            description: task.description,
            dueDate: taskDueDate.toLocaleDateString('pt-BR'),
            daysRemaining,
            category: task.category,
            employee: task.employee
              ? { name: task.employee.name, role: ROLE_LABELS[task.employee.role] || task.employee.role }
              : null,
          },
        })
      }

      // Pages: One per one-off task (printed like special tasks)
      for (const task of taskResult.oneOffTasks) {
        const taskDueDate = new Date(task.dueDate)
        taskDueDate.setHours(0, 0, 0, 0)
        const daysRemaining = Math.ceil(
          (taskDueDate.getTime() - normalizedDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        pages.push({
          type: 'SPECIAL_TASK',
          title: 'Tarefa Avulsa',
          task: {
            title: task.title,
            description: task.description,
            dueDate: taskDueDate.toLocaleDateString('pt-BR'),
            daysRemaining,
            category: task.category,
            employee: task.employee
              ? { name: task.employee.name, role: ROLE_LABELS[task.employee.role] || task.employee.role }
              : null,
          },
        })
      }

      const formattedDate = date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })

      return NextResponse.json({
        type: 'DAILY_TASKS',
        houseName,
        date: formattedDate,
        pages,
        totalTasks: taskResult.tasks.length,
        totalSpecialTasks: taskResult.specialTasks.length,
        totalOneOffTasks: taskResult.oneOffTasks.length,
        hasMenu: !!(lunch || dinner),
      })
    }

    if (type === 'WEEKLY_MENU') {
      // Get week start (Monday)
      const weekStart = new Date(date)
      const dayNum = weekStart.getDay()
      const diff = dayNum === 0 ? -6 : 1 - dayNum
      weekStart.setDate(weekStart.getDate() + diff)

      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      // Run queries in parallel
      const [houseNameRecord, schedules] = await Promise.all([
        prisma.settings.findUnique({ where: { key: 'house_name' } }),
        prisma.mealSchedule.findMany({
          where: {
            date: {
              gte: weekStart,
              lte: weekEnd,
            },
          },
          select: { date: true, mealType: true, dish: { select: { name: true } } },
          orderBy: { date: 'asc' },
        }),
      ])

      const houseName = houseNameRecord?.value ?? 'Minha Casa'

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
  } catch (error) {
    console.error('Error generating print preview:', error)
    return NextResponse.json({ error: 'Erro ao gerar preview' }, { status: 500 })
  }
}
