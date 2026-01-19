import { prisma } from '@/lib/prisma'
import { TaskType, Category, Role } from '@prisma/client'
import { isTaskScheduledForDate } from '@/lib/rrule-utils'

export interface TaskForDate {
  id: string
  title: string
  description: string | null
  category: Category
  taskType: TaskType
  employee: {
    id: string
    name: string
    role: Role
  } | null
}

export interface SpecialTaskForDate extends TaskForDate {
  dueDays: number
  appearDate: string
  dueDate: string
}

export interface OneOffTaskForDate extends TaskForDate {
  dueDays: number
  dueDate: string
}

export interface TasksForDateResult {
  date: string
  tasks: TaskForDate[]
  specialTasks: SpecialTaskForDate[]
  oneOffTasks: OneOffTaskForDate[]
}

export async function getTasksForDate(
  dateStr: string,
  employeeId?: string | null
): Promise<TasksForDateResult> {
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month || !day) {
    throw new Error('Invalid date format')
  }

  const date = new Date(year, month - 1, day, 12, 0, 0)
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date')
  }

  const dayOfWeek = date.getDay()

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
    if (!task.rrule || !isTaskScheduledForDate(task.rrule, date, task.startDate)) {
      return false
    }
    if (task.employee && !task.employee.workDays.includes(dayOfWeek)) {
      return false
    }
    return true
  })

  // Filter SPECIAL tasks scheduled for this date
  const specialTasks = specialTasksRaw
    .filter((task) => {
      if (!task.rrule || !isTaskScheduledForDate(task.rrule, date, task.startDate)) {
        return false
      }
      if (task.employee && !task.employee.workDays.includes(dayOfWeek)) {
        return false
      }
      return true
    })
    .map((task) => {
      const dueDate = new Date(date)
      dueDate.setDate(dueDate.getDate() + (task.dueDays || 7))
      return {
        ...task,
        appearDate: dateStr,
        dueDate: dueDate.toISOString().split('T')[0]!,
      }
    })

  // Filter ONE_OFF tasks
  const oneOffTasks = oneOffTasksRaw
    .filter((task) => {
      if (task.employee && !task.employee.workDays.includes(dayOfWeek)) {
        return false
      }
      return true
    })
    .map((task) => {
      const dueDate = new Date(date)
      dueDate.setDate(dueDate.getDate() + (task.dueDays || 7))
      return {
        ...task,
        dueDate: dueDate.toISOString().split('T')[0]!,
      }
    })

  return {
    date: dateStr,
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
      dueDays: task.dueDays || 7,
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
      dueDays: task.dueDays || 7,
      dueDate: task.dueDate,
      employee: task.employee
        ? {
            id: task.employee.id,
            name: task.employee.name,
            role: task.employee.role,
          }
        : null,
    })),
  }
}
