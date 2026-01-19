import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTasksForDate, markOneOffTasksAsPrinted } from '@/lib/task-scheduler'
import {
  printWeeklyMenu,
  printMultiPageDaily,
  PrinterType,
  PrintPage,
} from '@/lib/printer'

const ROLE_LABELS: Record<string, string> = {
  FAXINEIRA: 'Faxineira',
  COZINHEIRA: 'Cozinheira',
  BABA: 'Babá',
  JARDINEIRO: 'Jardineiro',
  MOTORISTA: 'Motorista',
  OUTRO: 'Outro',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, date: dateParam, employeeId, includeSpecialTasks = true } = body

    if (!type || !dateParam) {
      return NextResponse.json({ error: 'type e date são obrigatórios' }, { status: 400 })
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

    // Get printer settings
    const [ipRecord, typeRecord, houseRecord, notesRecord] = await Promise.all([
      prisma.settings.findUnique({ where: { key: 'printer_ip' } }),
      prisma.settings.findUnique({ where: { key: 'printer_type' } }),
      prisma.settings.findUnique({ where: { key: 'house_name' } }),
      prisma.settings.findUnique({ where: { key: 'print_notes_section' } }),
    ])

    const printerIp = ipRecord?.value ?? '192.168.1.230'
    const printerType = (typeRecord?.value ?? 'EPSON') as PrinterType
    const houseName = houseRecord?.value ?? 'Minha Casa'
    const showNotesSection = notesRecord?.value === 'true'

    if (type === 'DAILY_TASKS') {
      const dateStr = date.toISOString().split('T')[0]!

      // Get tasks using unified engine and meals in parallel
      const [taskResult, meals] = await Promise.all([
        getTasksForDate(dateParam, {
          employeeId: employeeId || undefined,
          includeSpecialTasks,
        }),
        prisma.mealSchedule.findMany({
          where: {
            date: {
              gte: new Date(dateStr),
              lt: new Date(new Date(dateStr).getTime() + 24 * 60 * 60 * 1000),
            },
          },
          include: { dish: { select: { name: true } } },
        }),
      ])

      const lunch = meals.find((m) => m.mealType === 'ALMOCO')?.dish.name
      const dinner = meals.find((m) => m.mealType === 'JANTAR')?.dish.name

      // Check if we have anything to print
      if (
        taskResult.tasks.length === 0 &&
        taskResult.specialTasks.length === 0 &&
        taskResult.oneOffTasks.length === 0 &&
        !lunch &&
        !dinner
      ) {
        return NextResponse.json(
          { error: 'Não há tarefas, cardápio, tarefas especiais ou avulsas para imprimir nesta data' },
          { status: 400 }
        )
      }

      // Build pages array
      const pages: PrintPage[] = []

      // Group tasks by employee
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
          tasks: unassignedTasks,
        })
      }

      // Pages: One per employee
      for (const group of Object.values(employeeGroups)) {
        pages.push({
          type: 'EMPLOYEE_TASKS',
          employee: { name: group.name, role: group.role },
          tasks: group.tasks,
        })
      }

      // Page: Menu (if meals exist)
      if (lunch || dinner) {
        pages.push({
          type: 'MENU',
          lunch,
          dinner,
        })
      }

      // Pages: One per special task
      for (const task of taskResult.specialTasks) {
        pages.push({
          type: 'SPECIAL_TASK',
          task: {
            title: task.title,
            description: task.description,
            dueDate: new Date(task.dueDate),
            category: task.category,
            employee: task.employee
              ? { name: task.employee.name, role: ROLE_LABELS[task.employee.role] || task.employee.role }
              : null,
          },
        })
      }

      // Pages: One per one-off task (printed like special tasks)
      for (const task of taskResult.oneOffTasks) {
        pages.push({
          type: 'SPECIAL_TASK',
          task: {
            title: task.title,
            description: task.description,
            dueDate: new Date(task.dueDate),
            category: task.category,
            employee: task.employee
              ? { name: task.employee.name, role: ROLE_LABELS[task.employee.role] || task.employee.role }
              : null,
          },
        })
      }

      // Print multi-page
      await printMultiPageDaily({
        ip: printerIp,
        type: printerType,
        houseName,
        date,
        pages,
        showNotesSection,
      })

      // Mark ONE_OFF tasks as printed using unified function
      if (taskResult.oneOffTasks.length > 0) {
        await markOneOffTasksAsPrinted(taskResult.oneOffTasks.map((t) => t.id))
      }

      return NextResponse.json({ success: true, message: 'Impresso com sucesso!' })
    }

    if (type === 'WEEKLY_MENU') {
      // Get week start (Monday)
      const weekStart = new Date(date)
      const dayNum = weekStart.getDay()
      const diff = dayNum === 0 ? -6 : 1 - dayNum
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
          date: dayDate,
          lunch: daySchedules.find((s) => s.mealType === 'ALMOCO')?.dish.name,
          dinner: daySchedules.find((s) => s.mealType === 'JANTAR')?.dish.name,
        })
      }

      await printWeeklyMenu({
        ip: printerIp,
        type: printerType,
        houseName,
        weekStart,
        days,
      })

      return NextResponse.json({ success: true, message: 'Cardápio impresso com sucesso!' })
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao imprimir' },
      { status: 500 }
    )
  }
}
