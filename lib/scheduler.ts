import cron, { type ScheduledTask } from 'node-cron'
import { prisma } from './prisma'
import { markOneOffTasksAsPrinted } from './task-scheduler'
import { printMultiPageDaily, printWeeklyMenu } from './printer'
import {
  getPrinterSettings,
  buildDailyPrintData,
  getWeeklyMenuData,
  formatDateStr,
} from './print-service'
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
  const settings = await getPrinterSettings()

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

      // Build print data using service
      const printData = await buildDailyPrintData(todayStr, {
        employeeId: job.employeeId || undefined,
      })

      // Check if we have anything to print
      if (!printData.hasSomethingToPrint) {
        await createPrintLog(jobId, 'SKIPPED', 'Nenhuma tarefa, cardápio, tarefa especial ou avulsa para hoje')
        return {
          success: false,
          status: 'SKIPPED',
          message: 'Nenhuma tarefa para hoje',
        }
      }

      // Print multi-page
      await printMultiPageDaily({
        ip: settings.ip,
        type: settings.type,
        houseName: settings.houseName,
        date: today,
        pages: printData.pages,
        showNotesSection: settings.showNotesSection,
      })

      // Mark ONE_OFF tasks as printed and update job
      await Promise.all([
        printData.oneOffTaskIds.length > 0
          ? markOneOffTasksAsPrinted(printData.oneOffTaskIds)
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
        message: `Impresso com sucesso! ${printData.taskCount} tarefa(s), ${printData.specialTaskCount} especial(is), ${printData.oneOffTaskCount} avulsa(s)`,
      }
    }

    if (job.type === 'WEEKLY_MENU') {
      // Get week start (Monday)
      const weekStart = new Date(today)
      const day = weekStart.getDay()
      const diff = day === 0 ? -6 : 1 - day
      weekStart.setDate(weekStart.getDate() + diff)

      // Get weekly menu data using service
      const days = await getWeeklyMenuData(weekStart)

      await printWeeklyMenu({
        ip: settings.ip,
        type: settings.type,
        houseName: settings.houseName,
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
