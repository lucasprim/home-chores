import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TaskType } from '@prisma/client'
import { getScheduledWeekdays } from '@/lib/rrule-utils'

interface WeekDayTasks {
  date: string
  dayOfWeek: number
  tasks: {
    id: string
    title: string
    description: string | null
    category: string
  }[]
}

interface EmployeeWeekSchedule {
  id: string
  name: string
  role: string
  workDays: number[]
  days: WeekDayTasks[]
}

interface TaskWithSchedule {
  id: string
  title: string
  description: string | null
  category: string
  employeeId: string | null
  scheduledWeekdays: number[]
  startDate: Date | null
}

/**
 * GET /api/tasks/for-week?date=YYYY-MM-DD
 *
 * Returns tasks for each day of the week containing the given date,
 * organized by employee. Only includes recurring tasks to show the schedule.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    if (!dateParam) {
      return NextResponse.json({ error: 'Data é obrigatória' }, { status: 400 })
    }

    // Parse date parts to avoid timezone issues
    const [year, month, day] = dateParam.split('-').map(Number)
    if (!year || !month || !day) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
    }
    const inputDate = new Date(year, month - 1, day, 12, 0, 0)
    if (isNaN(inputDate.getTime())) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
    }

    // Calculate the start of the week (Monday)
    const dayOfWeek = inputDate.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(inputDate)
    monday.setDate(inputDate.getDate() + mondayOffset)

    // Generate all 7 days of the week with their day-of-week values
    const weekDays: { date: Date; dow: number; dateStr: string }[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      weekDays.push({
        date: d,
        dow: d.getDay(),
        dateStr: formatDate(d),
      })
    }

    // Get all active employees and recurring tasks in parallel
    const [employees, allTasks] = await Promise.all([
      prisma.employee.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      }),
      prisma.task.findMany({
        where: {
          active: true,
          taskType: TaskType.RECURRING,
        },
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

    // Pre-compute scheduled weekdays for each task (parse rrule only once per task)
    // Pass monday as week start for startDate filtering
    const tasksWithSchedule: TaskWithSchedule[] = allTasks
      .filter((task) => task.rrule)
      .map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        category: task.category,
        employeeId: task.employeeId,
        scheduledWeekdays: getScheduledWeekdays(task.rrule!, monday, task.startDate),
        startDate: task.startDate,
      }))

    // Create a map of employeeId -> tasks for quick lookup
    const tasksByEmployee = new Map<string | null, TaskWithSchedule[]>()
    for (const task of tasksWithSchedule) {
      const key = task.employeeId
      if (!tasksByEmployee.has(key)) {
        tasksByEmployee.set(key, [])
      }
      tasksByEmployee.get(key)!.push(task)
    }

    // Build schedule for each employee
    const employeeSchedules: EmployeeWeekSchedule[] = employees.map((employee) => {
      const employeeTasks = tasksByEmployee.get(employee.id) || []
      const workDaysSet = new Set(employee.workDays)

      const days: WeekDayTasks[] = weekDays.map(({ dow, dateStr }) => {
        const employeeWorksToday = workDaysSet.has(dow)

        // Find tasks scheduled for this weekday
        const tasksForDay = employeeWorksToday
          ? employeeTasks
              .filter((task) => task.scheduledWeekdays.includes(dow))
              .map((task) => ({
                id: task.id,
                title: task.title,
                description: task.description,
                category: task.category,
              }))
          : []

        return {
          date: dateStr,
          dayOfWeek: dow,
          tasks: tasksForDay,
        }
      })

      return {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        workDays: employee.workDays,
        days,
      }
    })

    // Build schedule for unassigned tasks
    const unassignedTasks = tasksByEmployee.get(null) || []
    const unassignedDays: WeekDayTasks[] = weekDays.map(({ dow, dateStr }) => ({
      date: dateStr,
      dayOfWeek: dow,
      tasks: unassignedTasks
        .filter((task) => task.scheduledWeekdays.includes(dow))
        .map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          category: task.category,
        })),
    }))

    const hasUnassignedTasks = unassignedDays.some((d) => d.tasks.length > 0)

    return NextResponse.json({
      weekStart: weekDays[0]!.dateStr,
      weekEnd: weekDays[6]!.dateStr,
      employees: employeeSchedules,
      unassigned: hasUnassignedTasks
        ? {
            id: 'unassigned',
            name: 'Sem atribuição',
            role: 'OUTRO',
            workDays: [0, 1, 2, 3, 4, 5, 6],
            days: unassignedDays,
          }
        : null,
    })
  } catch (error) {
    console.error('Error fetching tasks for week:', error)
    return NextResponse.json({ error: 'Erro ao buscar tarefas da semana' }, { status: 500 })
  }
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}
