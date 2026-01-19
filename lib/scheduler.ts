import cron, { type ScheduledTask } from 'node-cron'
import { prisma } from './prisma'
import { getTasksForDate, markOneOffTasksAsPrinted } from './task-scheduler'
import { printMultiPageDaily, printWeeklyMenu, PrinterType, PrintPage } from './printer'
import type { PrintJob, Employee } from '@prisma/client'

type PrintJobWithEmployee = PrintJob & {
  employee: Pick<Employee, 'id' | 'name' | 'role' | 'workDays'> | null
}

const ROLE_LABELS: Record<string, string> = {
  FAXINEIRA: 'Faxineira',
  COZINHEIRA: 'Cozinheira',
  BABA: 'Babá',
  JARDINEIRO: 'Jardineiro',
  MOTORISTA: 'Motorista',
  OUTRO: 'Outro',
}

// Map of job IDs to scheduled tasks
const activeJobs: Map<string, ScheduledTask> = new Map()

let initialized = false

/**
 * Initialize the scheduler by loading all enabled print jobs from the database
 */
export async function initScheduler(): Promise<void> {
  if (initialized) {
    console.log('[Scheduler] Already initialized')
    return
  }

  try {
    const jobs = await prisma.printJob.findMany({
      where: { enabled: true },
      include: {
        employee: {
          select: { id: true, name: true, role: true, workDays: true },
        },
      },
    })

    for (const job of jobs) {
      scheduleJob(job)
    }

    initialized = true
    console.log(`[Scheduler] Initialized with ${jobs.length} active jobs`)
  } catch (error) {
    console.error('[Scheduler] Failed to initialize:', error)
  }
}

/**
 * Schedule a print job
 */
export function scheduleJob(job: PrintJobWithEmployee): void {
  // Cancel existing job if any
  unscheduleJob(job.id)

  // Validate cron expression
  if (!cron.validate(job.cronExpression)) {
    console.error(`[Scheduler] Invalid cron expression for job ${job.id}: ${job.cronExpression}`)
    return
  }

  // Create scheduled task
  const task = cron.schedule(
    job.cronExpression,
    async () => {
      console.log(`[Scheduler] Executing job ${job.id}: ${job.name}`)
      await executePrintJob(job.id)
    },
    {
      timezone: 'America/Sao_Paulo',
    }
  )

  activeJobs.set(job.id, task)
  console.log(`[Scheduler] Scheduled job ${job.id}: ${job.name} (${job.cronExpression})`)
}

/**
 * Unschedule a print job
 */
export function unscheduleJob(jobId: string): void {
  const task = activeJobs.get(jobId)
  if (task) {
    task.stop()
    activeJobs.delete(jobId)
    console.log(`[Scheduler] Unscheduled job ${jobId}`)
  }
}

/**
 * Reschedule a print job (call after updating a job)
 */
export async function rescheduleJob(jobId: string): Promise<void> {
  const job = await prisma.printJob.findUnique({
    where: { id: jobId },
    include: {
      employee: {
        select: { id: true, name: true, role: true, workDays: true },
      },
    },
  })

  if (job && job.enabled) {
    scheduleJob(job)
  } else {
    unscheduleJob(jobId)
  }
}

function formatDateStr(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Execute a print job by ID
 */
export async function executePrintJob(jobId: string): Promise<{
  success: boolean
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED'
  message: string
}> {
  const job = await prisma.printJob.findUnique({
    where: { id: jobId },
    include: {
      employee: {
        select: { id: true, name: true, role: true, workDays: true },
      },
    },
  })

  if (!job) {
    return { success: false, status: 'FAILED', message: 'Job not found' }
  }

  // Get printer settings
  const [ipRecord, typeRecord, houseRecord] = await Promise.all([
    prisma.settings.findUnique({ where: { key: 'printer_ip' } }),
    prisma.settings.findUnique({ where: { key: 'printer_type' } }),
    prisma.settings.findUnique({ where: { key: 'house_name' } }),
  ])

  const printerIp = ipRecord?.value ?? '192.168.1.230'
  const printerType = (typeRecord?.value ?? 'EPSON') as PrinterType
  const houseName = houseRecord?.value ?? 'Minha Casa'

  const today = new Date()
  const dayOfWeek = today.getDay()
  const todayStr = formatDateStr(today)

  try {
    if (job.type === 'DAILY_TASKS') {
      // Check if employee works today
      if (job.employee && !job.employee.workDays.includes(dayOfWeek)) {
        await createPrintLog(jobId, 'SKIPPED', 'Funcionário não trabalha hoje')
        return {
          success: false,
          status: 'SKIPPED',
          message: 'Funcionário não trabalha hoje',
        }
      }

      // Get tasks using unified engine
      const taskResult = await getTasksForDate(todayStr, {
        employeeId: job.employeeId || undefined,
      })

      // Get meals for today
      const meals = await prisma.mealSchedule.findMany({
        where: {
          date: {
            gte: new Date(todayStr),
            lt: new Date(new Date(todayStr).getTime() + 24 * 60 * 60 * 1000),
          },
        },
        include: { dish: { select: { name: true } } },
      })

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
        await createPrintLog(jobId, 'SKIPPED', 'Nenhuma tarefa, cardápio, tarefa especial ou avulsa para hoje')
        return {
          success: false,
          status: 'SKIPPED',
          message: 'Nenhuma tarefa para hoje',
        }
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

      // Print multi-page
      await printMultiPageDaily({
        ip: printerIp,
        type: printerType,
        houseName,
        date: today,
        pages,
      })

      // Mark ONE_OFF tasks as printed using unified function and update job
      await Promise.all([
        taskResult.oneOffTasks.length > 0
          ? markOneOffTasksAsPrinted(taskResult.oneOffTasks.map((t) => t.id))
          : Promise.resolve(),
        createPrintLog(jobId, 'SUCCESS'),
        prisma.printJob.update({
          where: { id: jobId },
          data: { lastRunAt: new Date() },
        }),
      ])

      return {
        success: true,
        status: 'SUCCESS',
        message: `Impresso com sucesso! ${taskResult.tasks.length} tarefa(s), ${taskResult.specialTasks.length} especial(is), ${taskResult.oneOffTasks.length} avulsa(s)`,
      }
    }

    if (job.type === 'WEEKLY_MENU') {
      // Get week start (Monday)
      const weekStart = new Date(today)
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

      await Promise.all([
        createPrintLog(jobId, 'SUCCESS'),
        prisma.printJob.update({
          where: { id: jobId },
          data: { lastRunAt: new Date() },
        }),
      ])

      return {
        success: true,
        status: 'SUCCESS',
        message: 'Cardápio impresso com sucesso!',
      }
    }

    return { success: false, status: 'FAILED', message: 'Tipo de job inválido' }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    await createPrintLog(jobId, 'FAILED', errorMessage)
    console.error(`[Scheduler] Failed to execute job ${jobId}:`, error)
    return {
      success: false,
      status: 'FAILED',
      message: errorMessage,
    }
  }
}

async function createPrintLog(
  printJobId: string,
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED',
  error?: string
): Promise<void> {
  await prisma.printLog.create({
    data: {
      printJobId,
      status,
      error,
    },
  })
}

/**
 * Get the number of active scheduled jobs
 */
export function getActiveJobCount(): number {
  return activeJobs.size
}

/**
 * Check if the scheduler has been initialized
 */
export function isSchedulerInitialized(): boolean {
  return initialized
}
