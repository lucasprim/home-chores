/**
 * Unified Task Scheduling Engine
 *
 * This is the SINGLE SOURCE OF TRUTH for determining which tasks appear on which dates.
 * All consumers (Today page, Print preview, Print, Scheduler) should use these functions.
 */

import { prisma } from '@/lib/prisma'
import { TaskType, Category, Role } from '@prisma/client'
import { isTaskScheduledForDate, getScheduledWeekdays } from '@/lib/rrule-utils'

// ============================================================================
// Types
// ============================================================================

export interface TaskEmployee {
  id: string
  name: string
  role: Role
  workDays: number[]
}

export interface BaseTask {
  id: string
  title: string
  description: string | null
  category: Category
  taskType: TaskType
  employee: TaskEmployee | null
}

export interface RecurringTask extends BaseTask {
  taskType: typeof TaskType.RECURRING
}

export interface SpecialTask extends BaseTask {
  taskType: typeof TaskType.SPECIAL
  dueDays: number
  appearDate: string
  dueDate: string
}

export interface OneOffTask extends BaseTask {
  taskType: typeof TaskType.ONE_OFF
  dueDays: number
  dueDate: string
}

export interface TasksForDateResult {
  date: string
  dayOfWeek: number
  tasks: RecurringTask[]
  specialTasks: SpecialTask[]
  oneOffTasks: OneOffTask[]
}

export interface WeekDayTasks {
  date: string
  dayOfWeek: number
  tasks: {
    id: string
    title: string
    description: string | null
    category: Category
  }[]
}

export interface EmployeeWeekSchedule {
  id: string
  name: string
  role: Role | 'OUTRO'
  workDays: number[]
  days: WeekDayTasks[]
}

export interface TasksForWeekResult {
  weekStart: string
  weekEnd: string
  employees: EmployeeWeekSchedule[]
  unassigned: EmployeeWeekSchedule | null
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDateStr(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month || !day) {
    throw new Error('Invalid date format')
  }
  const date = new Date(year, month - 1, day, 12, 0, 0) // noon to avoid timezone issues
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date')
  }
  return date
}

/**
 * Core filtering logic for recurring/special tasks
 * This is the SINGLE implementation of the rrule + workDays check
 */
function isTaskScheduledForDay(
  task: { rrule: string | null; startDate: Date | null; employee: { workDays: number[] } | null },
  date: Date,
  dayOfWeek: number
): boolean {
  // Must have an rrule and be scheduled for this date
  if (!task.rrule || !isTaskScheduledForDate(task.rrule, date, task.startDate)) {
    return false
  }
  // If employee is assigned, they must work on this day
  if (task.employee && !task.employee.workDays.includes(dayOfWeek)) {
    return false
  }
  return true
}

/**
 * Core filtering logic for one-off tasks (no rrule, just workDays check)
 */
function isOneOffTaskScheduledForDay(
  task: { employee: { workDays: number[] } | null },
  dayOfWeek: number
): boolean {
  // If employee is assigned, they must work on this day
  if (task.employee && !task.employee.workDays.includes(dayOfWeek)) {
    return false
  }
  return true
}

// ============================================================================
// Main API
// ============================================================================

/**
 * Get all tasks scheduled for a specific date.
 *
 * This is the unified function for:
 * - Today page daily view
 * - Print preview
 * - Print execution
 * - Scheduler
 *
 * @param dateStr - Date in YYYY-MM-DD format
 * @param options - Optional filters
 */
export async function getTasksForDate(
  dateStr: string,
  options: {
    employeeId?: string | null
    includeSpecialTasks?: boolean
    includeOneOffTasks?: boolean
  } = {}
): Promise<TasksForDateResult> {
  const { employeeId, includeSpecialTasks = true, includeOneOffTasks = true } = options

  const date = parseDateStr(dateStr)
  const dayOfWeek = date.getDay()

  const employeeSelect = { id: true, name: true, role: true, workDays: true }
  const baseWhere = { active: true, ...(employeeId && { employeeId }) }

  // Run queries in parallel - filtered by taskType at DB level
  const [recurringTasksRaw, specialTasksRaw, oneOffTasksRaw] = await Promise.all([
    prisma.task.findMany({
      where: { ...baseWhere, taskType: TaskType.RECURRING },
      include: { employee: { select: employeeSelect } },
    }),
    includeSpecialTasks
      ? prisma.task.findMany({
          where: { ...baseWhere, taskType: TaskType.SPECIAL },
          include: { employee: { select: employeeSelect } },
        })
      : Promise.resolve([]),
    includeOneOffTasks
      ? prisma.task.findMany({
          where: { ...baseWhere, taskType: TaskType.ONE_OFF, printedAt: null },
          include: { employee: { select: employeeSelect } },
        })
      : Promise.resolve([]),
  ])

  // Filter RECURRING tasks using unified logic
  const tasks: RecurringTask[] = recurringTasksRaw
    .filter((task) => isTaskScheduledForDay(task, date, dayOfWeek))
    .map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      category: task.category,
      taskType: TaskType.RECURRING,
      employee: task.employee
        ? {
            id: task.employee.id,
            name: task.employee.name,
            role: task.employee.role,
            workDays: task.employee.workDays,
          }
        : null,
    }))

  // Filter SPECIAL tasks using unified logic
  const specialTasks: SpecialTask[] = specialTasksRaw
    .filter((task) => isTaskScheduledForDay(task, date, dayOfWeek))
    .map((task) => {
      const dueDate = new Date(date)
      dueDate.setDate(dueDate.getDate() + (task.dueDays || 7))
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        category: task.category,
        taskType: TaskType.SPECIAL,
        dueDays: task.dueDays || 7,
        appearDate: dateStr,
        dueDate: formatDateStr(dueDate),
        employee: task.employee
          ? {
              id: task.employee.id,
              name: task.employee.name,
              role: task.employee.role,
              workDays: task.employee.workDays,
            }
          : null,
      }
    })

  // Filter ONE_OFF tasks using unified logic
  const oneOffTasks: OneOffTask[] = oneOffTasksRaw
    .filter((task) => isOneOffTaskScheduledForDay(task, dayOfWeek))
    .map((task) => {
      const dueDate = new Date(date)
      dueDate.setDate(dueDate.getDate() + (task.dueDays || 7))
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        category: task.category,
        taskType: TaskType.ONE_OFF,
        dueDays: task.dueDays || 7,
        dueDate: formatDateStr(dueDate),
        employee: task.employee
          ? {
              id: task.employee.id,
              name: task.employee.name,
              role: task.employee.role,
              workDays: task.employee.workDays,
            }
          : null,
      }
    })

  return {
    date: dateStr,
    dayOfWeek,
    tasks,
    specialTasks,
    oneOffTasks,
  }
}

/**
 * Get all recurring tasks scheduled for a week, organized by employee.
 *
 * This is the unified function for:
 * - Today page weekly view
 * - /api/tasks/for-week
 *
 * @param dateStr - Any date within the target week (YYYY-MM-DD format)
 */
export async function getTasksForWeek(dateStr: string): Promise<TasksForWeekResult> {
  const inputDate = parseDateStr(dateStr)

  // Calculate week boundaries (Monday to Sunday)
  const dayOfWeek = inputDate.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStart = new Date(inputDate)
  weekStart.setDate(inputDate.getDate() + mondayOffset)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  // Generate all 7 days of the week
  const weekDays: { date: Date; dow: number; dateStr: string }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    weekDays.push({
      date: d,
      dow: d.getDay(),
      dateStr: formatDateStr(d),
    })
  }

  // Run queries in parallel
  const [employees, allTasks] = await Promise.all([
    prisma.employee.findMany({
      where: { active: true },
      select: { id: true, name: true, role: true, workDays: true },
      orderBy: { name: 'asc' },
    }),
    prisma.task.findMany({
      where: { active: true, taskType: { in: [TaskType.RECURRING, TaskType.SPECIAL] } },
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
  interface TaskWithSchedule {
    id: string
    title: string
    description: string | null
    category: Category
    employeeId: string | null
    scheduledWeekdays: number[]
  }

  const tasksWithSchedule: TaskWithSchedule[] = allTasks
    .filter((task) => task.rrule)
    .map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      category: task.category,
      employeeId: task.employeeId,
      scheduledWeekdays: getScheduledWeekdays(task.rrule!, weekStart, task.startDate),
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

  return {
    weekStart: formatDateStr(weekStart),
    weekEnd: formatDateStr(weekEnd),
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
  }
}

/**
 * Mark one-off tasks as printed.
 * Called after successful print operations.
 */
export async function markOneOffTasksAsPrinted(taskIds: string[]): Promise<void> {
  if (taskIds.length === 0) return

  await prisma.task.updateMany({
    where: { id: { in: taskIds } },
    data: { printedAt: new Date(), active: false },
  })
}
