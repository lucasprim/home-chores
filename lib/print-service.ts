import { prisma } from './prisma'
import { getTasksForDate } from './task-scheduler'
import type { PrinterType, PrintPage } from './printer'

// =============================================================================
// CONSTANTS
// =============================================================================

export const ROLE_LABELS: Record<string, string> = {
  FAXINEIRA: 'Faxineira',
  COZINHEIRA: 'Cozinheira',
  BABA: 'Babá',
  JARDINEIRO: 'Jardineiro',
  MOTORISTA: 'Motorista',
  OUTRO: 'Outro',
}

// =============================================================================
// TYPES
// =============================================================================

export interface PrinterSettings {
  ip: string
  type: PrinterType
  houseName: string
  showNotesSection: boolean
}

export interface SpecialTaskData {
  title: string
  description: string | null
  dueDate: Date
  category: string
  employee: { name: string; role: string } | null
}

export interface DailyPrintData {
  pages: PrintPage[]
  hasSomethingToPrint: boolean
  taskCount: number
  specialTaskCount: number
  oneOffTaskCount: number
  hasMenu: boolean
  lunch?: string
  dinner?: string
  /** Raw task result for callers that need to mark one-off tasks as printed */
  oneOffTaskIds: string[]
  /** Grouped tasks by employee for preview building */
  unassignedTasks: { title: string; description: string | null }[]
  employeeGroups: Record<string, { name: string; role: string; tasks: { title: string; description: string | null }[] }>
  /** Separated special task data for preview (needs different titles) */
  specialTasks: SpecialTaskData[]
  oneOffTasks: SpecialTaskData[]
}

export interface WeeklyMenuDay {
  date: Date
  lunch?: string
  dinner?: string
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format a Date object to YYYY-MM-DD string
 */
export function formatDateStr(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// =============================================================================
// SETTINGS
// =============================================================================

/**
 * Fetch printer settings from the database with defaults
 */
export async function getPrinterSettings(): Promise<PrinterSettings> {
  const [ipRecord, typeRecord, houseRecord, notesRecord] = await Promise.all([
    prisma.settings.findUnique({ where: { key: 'printer_ip' } }),
    prisma.settings.findUnique({ where: { key: 'printer_type' } }),
    prisma.settings.findUnique({ where: { key: 'house_name' } }),
    prisma.settings.findUnique({ where: { key: 'print_notes_section' } }),
  ])

  return {
    ip: ipRecord?.value ?? '192.168.1.230',
    type: (typeRecord?.value ?? 'EPSON') as PrinterType,
    houseName: houseRecord?.value ?? 'Minha Casa',
    showNotesSection: notesRecord?.value === 'true',
  }
}

// =============================================================================
// MEALS
// =============================================================================

/**
 * Fetch meals (lunch and dinner) for a specific date
 */
export async function getMealsForDate(
  dateStr: string
): Promise<{ lunch?: string; dinner?: string }> {
  const meals = await prisma.mealSchedule.findMany({
    where: {
      date: {
        gte: new Date(dateStr),
        lt: new Date(new Date(dateStr).getTime() + 24 * 60 * 60 * 1000),
      },
    },
    include: { dish: { select: { name: true } } },
  })

  return {
    lunch: meals.find((m) => m.mealType === 'ALMOCO')?.dish.name,
    dinner: meals.find((m) => m.mealType === 'JANTAR')?.dish.name,
  }
}

/**
 * Fetch weekly menu data starting from a given Monday
 */
export async function getWeeklyMenuData(weekStart: Date): Promise<WeeklyMenuDay[]> {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

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

  const days: WeeklyMenuDay[] = []
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

  return days
}

// =============================================================================
// DAILY PRINT DATA
// =============================================================================

export interface BuildDailyPrintDataOptions {
  employeeId?: string
  includeSpecialTasks?: boolean
}

/**
 * Build the complete daily print data including tasks grouped by employee,
 * meals, special tasks, and one-off tasks
 */
export async function buildDailyPrintData(
  dateStr: string,
  options: BuildDailyPrintDataOptions = {}
): Promise<DailyPrintData> {
  const { employeeId, includeSpecialTasks = true } = options

  // Fetch tasks and meals in parallel
  const [taskResult, meals] = await Promise.all([
    getTasksForDate(dateStr, {
      employeeId,
      includeSpecialTasks,
    }),
    getMealsForDate(dateStr),
  ])

  const { lunch, dinner } = meals

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

  // Page: Unassigned tasks (if any)
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

  const hasSomethingToPrint =
    taskResult.tasks.length > 0 ||
    taskResult.specialTasks.length > 0 ||
    taskResult.oneOffTasks.length > 0 ||
    !!lunch ||
    !!dinner

  // Build special task data for preview (needs to distinguish between special and one-off)
  const specialTasksData: SpecialTaskData[] = taskResult.specialTasks.map((task) => ({
    title: task.title,
    description: task.description,
    dueDate: new Date(task.dueDate),
    category: task.category,
    employee: task.employee
      ? { name: task.employee.name, role: ROLE_LABELS[task.employee.role] || task.employee.role }
      : null,
  }))

  const oneOffTasksData: SpecialTaskData[] = taskResult.oneOffTasks.map((task) => ({
    title: task.title,
    description: task.description,
    dueDate: new Date(task.dueDate),
    category: task.category,
    employee: task.employee
      ? { name: task.employee.name, role: ROLE_LABELS[task.employee.role] || task.employee.role }
      : null,
  }))

  return {
    pages,
    hasSomethingToPrint,
    taskCount: taskResult.tasks.length,
    specialTaskCount: taskResult.specialTasks.length,
    oneOffTaskCount: taskResult.oneOffTasks.length,
    hasMenu: !!(lunch || dinner),
    lunch,
    dinner,
    oneOffTaskIds: taskResult.oneOffTasks.map((t) => t.id),
    unassignedTasks,
    employeeGroups,
    specialTasks: specialTasksData,
    oneOffTasks: oneOffTasksData,
  }
}
