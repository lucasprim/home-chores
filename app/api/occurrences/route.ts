import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isTaskScheduledForDate } from '@/lib/rrule-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const employeeId = searchParams.get('employeeId')

    if (!dateParam) {
      return NextResponse.json({ error: 'Data é obrigatória' }, { status: 400 })
    }

    const date = new Date(dateParam)
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
    }

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

    // Filter tasks that are scheduled for this date
    const dayOfWeek = date.getDay() // 0=Sun, 1=Mon, ...
    const scheduledTasks = tasks.filter((task) => {
      // Check if task is scheduled for this date based on rrule
      if (!isTaskScheduledForDate(task.rrule, date)) {
        return false
      }

      // Check if employee works on this day
      if (task.employee) {
        if (!task.employee.workDays.includes(dayOfWeek)) {
          return false
        }
      }

      return true
    })

    // Get existing occurrences for this date
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const existingOccurrences = await prisma.taskOccurrence.findMany({
      where: {
        date: startOfDay,
        taskId: { in: scheduledTasks.map((t) => t.id) },
      },
    })

    const occurrenceMap = new Map(existingOccurrences.map((o) => [o.taskId, o]))

    // Build response with task + occurrence info
    const result = scheduledTasks.map((task) => {
      const occurrence = occurrenceMap.get(task.id)
      return {
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          category: task.category,
          employeeId: task.employeeId,
          employee: task.employee
            ? {
                id: task.employee.id,
                name: task.employee.name,
                role: task.employee.role,
              }
            : null,
        },
        occurrence: occurrence
          ? {
              id: occurrence.id,
              completed: occurrence.completed,
              completedAt: occurrence.completedAt,
              notes: occurrence.notes,
            }
          : null,
      }
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar tarefas do dia' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, date, completed, notes } = body

    if (!taskId || !date) {
      return NextResponse.json({ error: 'taskId e date são obrigatórios' }, { status: 400 })
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } })
    if (!task) {
      return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
    }

    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
    }

    const startOfDay = new Date(dateObj)
    startOfDay.setHours(0, 0, 0, 0)

    const occurrence = await prisma.taskOccurrence.upsert({
      where: {
        taskId_date: {
          taskId,
          date: startOfDay,
        },
      },
      update: {
        completed: completed ?? false,
        completedAt: completed ? new Date() : null,
        notes: notes ?? null,
      },
      create: {
        taskId,
        date: startOfDay,
        completed: completed ?? false,
        completedAt: completed ? new Date() : null,
        notes: notes ?? null,
      },
    })

    return NextResponse.json(occurrence, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar ocorrência' }, { status: 500 })
  }
}
