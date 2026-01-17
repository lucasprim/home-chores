import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isTaskScheduledForDate } from '@/lib/rrule-utils'

/**
 * GET /api/tasks/for-date?date=YYYY-MM-DD
 *
 * Returns tasks and special tasks that should appear on the print list for a given date.
 * This is a read-only preview - no tracking of completion or occurrences.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const employeeId = searchParams.get('employeeId')

    if (!dateParam) {
      return NextResponse.json({ error: 'Data é obrigatória' }, { status: 400 })
    }

    // Parse date parts to avoid timezone issues (dateParam is "YYYY-MM-DD")
    const [year, month, day] = dateParam.split('-').map(Number)
    if (!year || !month || !day) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
    }
    const date = new Date(year, month - 1, day, 12, 0, 0) // Use noon to avoid timezone edge cases
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
    }

    const dayOfWeek = date.getDay() // 0=Sun, 1=Mon, ...

    // Get all active regular tasks
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

    // Filter tasks that are scheduled for this date based on rrule
    const scheduledTasks = tasks.filter((task) => {
      // Check if task is scheduled for this date based on rrule
      if (!isTaskScheduledForDate(task.rrule, date)) {
        return false
      }
      // Check if employee works on this day
      if (task.employee && !task.employee.workDays.includes(dayOfWeek)) {
        return false
      }
      return true
    })

    // Get all active special tasks
    const specialTasks = await prisma.specialTask.findMany({
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

    // Filter special tasks that are scheduled for this date based on rrule
    const scheduledSpecialTasks = specialTasks
      .filter((task) => {
        // Check if task is scheduled for this date based on rrule
        if (!isTaskScheduledForDate(task.rrule, date)) {
          return false
        }
        // Check if employee works on this day
        if (task.employee && !task.employee.workDays.includes(dayOfWeek)) {
          return false
        }
        return true
      })
      .map((task) => {
        // Calculate due date (appearDate + dueDays)
        const dueDate = new Date(date)
        dueDate.setDate(dueDate.getDate() + task.dueDays)
        return {
          ...task,
          appearDate: dateParam,
          dueDate: dueDate.toISOString().split('T')[0],
        }
      })

    return NextResponse.json({
      date: dateParam,
      tasks: scheduledTasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        category: task.category,
        employee: task.employee
          ? {
              id: task.employee.id,
              name: task.employee.name,
              role: task.employee.role,
            }
          : null,
      })),
      specialTasks: scheduledSpecialTasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        category: task.category,
        dueDays: task.dueDays,
        appearDate: task.appearDate,
        dueDate: task.dueDate,
        employee: task.employee
          ? {
              id: task.employee.id,
              name: task.employee.name,
              role: task.employee.role,
            }
          : null,
      })),
    })
  } catch (error) {
    console.error('Error fetching tasks for date:', error)
    return NextResponse.json({ error: 'Erro ao buscar tarefas do dia' }, { status: 500 })
  }
}
