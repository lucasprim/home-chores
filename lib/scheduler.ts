import cron, { type ScheduledTask } from 'node-cron'
import { prisma } from './prisma'
import { isTaskScheduledForDate } from './rrule-utils'
import { printDailyTasks, printWeeklyMenu, PrinterType } from './printer'
import type { PrintJob, Employee } from '@prisma/client'

type PrintJobWithEmployee = PrintJob & {
  employee: Pick<Employee, 'id' | 'name' | 'role' | 'workDays'> | null
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

      // Get all active tasks
      const tasks = await prisma.task.findMany({
        where: {
          active: true,
          ...(job.employeeId && { employeeId: job.employeeId }),
        },
        include: {
          employee: {
            select: { id: true, name: true, role: true, workDays: true },
          },
        },
      })

      // Filter tasks scheduled for today
      const scheduledTasks = tasks.filter((task) => {
        if (!isTaskScheduledForDate(task.rrule, today)) return false
        if (task.employee && !task.employee.workDays.includes(dayOfWeek)) return false
        return true
      })

      if (scheduledTasks.length === 0) {
        await createPrintLog(jobId, 'SKIPPED', 'Nenhuma tarefa para hoje')
        return {
          success: false,
          status: 'SKIPPED',
          message: 'Nenhuma tarefa para hoje',
        }
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
        date: today,
        employees: Object.values(employeeGroups),
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
        message: `Impresso com sucesso! ${scheduledTasks.length} tarefa(s)`,
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
