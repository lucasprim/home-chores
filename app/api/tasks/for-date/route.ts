import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TaskType } from '@prisma/client'
import { isTaskScheduledForDate } from '@/lib/rrule-utils'

/**
 * GET /api/tasks/for-date?date=YYYY-MM-DD
 *
 * Returns tasks of all types that should appear on the print list for a given date.
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

    const employeeSelect = { id: true, name: true, role: true, workDays: true }
    const baseWhere = { active: true, ...(employeeId && { employeeId }) }

    // Run three queries in parallel - filtered by taskType at DB level
    const [recurringTasksRaw, specialTasksRaw, oneOffTasksRaw] = await Promise.all([
      prisma.task.findMany({
        where: { ...baseWhere, taskType: TaskType.RECURRING },
        include: { employee: { select: employeeSelect } },
      }),
      prisma.task.findMany({
        where: { ...baseWhere, taskType: TaskType.SPECIAL },
        include: { employee: { select: employeeSelect } },
      }),
      prisma.task.findMany({
        where: { ...baseWhere, taskType: TaskType.ONE_OFF, printedAt: null },
        include: { employee: { select: employeeSelect } },
      }),
    ])

    // Filter RECURRING tasks scheduled for this date
    const recurringTasks = recurringTasksRaw.filter((task) => {
      // Check if task is scheduled for this date based on rrule (with startDate filtering)
      if (!task.rrule || !isTaskScheduledForDate(task.rrule, date, task.startDate)) {
        return false
      }
      // Check if employee works on this day
      if (task.employee && !task.employee.workDays.includes(dayOfWeek)) {
        return false
      }
      return true
    })

    // Filter SPECIAL tasks scheduled for this date
    const specialTasks = specialTasksRaw
      .filter((task) => {
        // Check if task is scheduled for this date based on rrule (with startDate filtering)
        if (!task.rrule || !isTaskScheduledForDate(task.rrule, date, task.startDate)) {
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
        dueDate.setDate(dueDate.getDate() + (task.dueDays || 7))
        return {
          ...task,
          appearDate: dateParam,
          dueDate: dueDate.toISOString().split('T')[0],
        }
      })

    // Filter ONE_OFF tasks (already filtered for printedAt === null in query)
    const oneOffTasks = oneOffTasksRaw
      .filter((task) => {
        // If employee is assigned, check if they work on this day
        if (task.employee && !task.employee.workDays.includes(dayOfWeek)) {
          return false
        }
        return true
      })
      .map((task) => {
        // Calculate due date (today + dueDays)
        const dueDate = new Date(date)
        dueDate.setDate(dueDate.getDate() + (task.dueDays || 7))
        return {
          ...task,
          dueDate: dueDate.toISOString().split('T')[0],
        }
      })

    return NextResponse.json({
      date: dateParam,
      tasks: recurringTasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        category: task.category,
        taskType: task.taskType,
        employee: task.employee
          ? {
              id: task.employee.id,
              name: task.employee.name,
              role: task.employee.role,
            }
          : null,
      })),
      specialTasks: specialTasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        category: task.category,
        taskType: task.taskType,
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
      oneOffTasks: oneOffTasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        category: task.category,
        taskType: task.taskType,
        dueDays: task.dueDays,
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
