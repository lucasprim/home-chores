import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isTaskScheduledForDate } from '@/lib/rrule-utils'
import { printDailyTasks, printWeeklyMenu, PrinterType } from '@/lib/printer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, date: dateParam, employeeId } = body

    if (!type || !dateParam) {
      return NextResponse.json({ error: 'type e date são obrigatórios' }, { status: 400 })
    }

    const date = new Date(dateParam)
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
    }

    // Get printer settings
    const ipRecord = await prisma.settings.findUnique({ where: { key: 'printer_ip' } })
    const typeRecord = await prisma.settings.findUnique({ where: { key: 'printer_type' } })
    const houseRecord = await prisma.settings.findUnique({ where: { key: 'house_name' } })

    const printerIp = ipRecord?.value ?? '192.168.1.230'
    const printerType = (typeRecord?.value ?? 'EPSON') as PrinterType
    const houseName = houseRecord?.value ?? 'Minha Casa'

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

      if (scheduledTasks.length === 0) {
        return NextResponse.json({ error: 'Não há tarefas para imprimir nesta data' }, { status: 400 })
      }

      // Group by employee
      const employeeGroups: Record<
        string,
        {
          name: string
          role: string
          tasks: { title: string; description: string | null }[]
        }
      > = {}

      for (const task of scheduledTasks) {
        const key = task.employee?.id ?? 'unassigned'
        const employeeName = task.employee?.name ?? 'Sem atribuição'
        const employeeRole = task.employee?.role ?? 'OUTRO'

        if (!employeeGroups[key]) {
          employeeGroups[key] = {
            name: employeeName,
            role: employeeRole,
            tasks: [],
          }
        }
        employeeGroups[key].tasks.push({
          title: task.title,
          description: task.description,
        })
      }

      await printDailyTasks({
        ip: printerIp,
        type: printerType,
        houseName,
        date,
        employees: Object.values(employeeGroups),
      })

      return NextResponse.json({ success: true, message: 'Impresso com sucesso!' })
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
