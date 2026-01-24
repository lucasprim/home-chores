import { NextRequest, NextResponse } from 'next/server'
import { escPosToHtml } from '@/lib/escpos-to-html'
import {
  formatMultiPageDaily,
  formatWeeklyMenuPage,
} from '@/lib/printer'
import {
  getPrinterSettings,
  buildDailyPrintData,
  getWeeklyMenuData,
} from '@/lib/print-service'

export type PreviewPage =
  | {
      type: 'UNASSIGNED_TASKS'
      title: string
      tasks: { title: string; description: string | null }[]
    }
  | {
      type: 'EMPLOYEE_TASKS'
      title: string
      employee: { name: string; role: string }
      tasks: { title: string; description: string | null }[]
    }
  | {
      type: 'MENU'
      title: string
      lunch?: string
      dinner?: string
    }
  | {
      type: 'SPECIAL_TASK'
      title: string
      task: {
        title: string
        description: string | null
        dueDate: string
        daysRemaining: number
        category: string
        employee: { name: string; role: string } | null
      }
    }

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'DAILY_TASKS'
    const dateParam = searchParams.get('date')
    const employeeId = searchParams.get('employeeId')
    const includeSpecialTasks = searchParams.get('includeSpecialTasks') !== 'false'

    if (!dateParam) {
      return NextResponse.json({ error: 'Data é obrigatória' }, { status: 400 })
    }

    // Validate date format
    const [year, month, day] = dateParam.split('-').map(Number)
    if (!year || !month || !day) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
    }
    const date = new Date(year, month - 1, day, 12, 0, 0)
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
    }

    if (type === 'DAILY_TASKS') {
      // Get print data and settings in parallel
      const [printData, settings] = await Promise.all([
        buildDailyPrintData(dateParam, {
          employeeId: employeeId || undefined,
          includeSpecialTasks,
        }),
        getPrinterSettings(),
      ])

      // Build preview pages with titles and formatted data
      const previewPages: PreviewPage[] = []
      const normalizedDate = new Date(date)
      normalizedDate.setHours(0, 0, 0, 0)

      // Unassigned tasks page
      if (printData.unassignedTasks.length > 0) {
        previewPages.push({
          type: 'UNASSIGNED_TASKS',
          title: 'Tarefas Gerais',
          tasks: printData.unassignedTasks,
        })
      }

      // Employee pages
      for (const group of Object.values(printData.employeeGroups)) {
        previewPages.push({
          type: 'EMPLOYEE_TASKS',
          title: group.name,
          employee: { name: group.name, role: group.role },
          tasks: group.tasks,
        })
      }

      // Menu page
      if (printData.lunch || printData.dinner) {
        previewPages.push({
          type: 'MENU',
          title: 'Cardápio do Dia',
          lunch: printData.lunch,
          dinner: printData.dinner,
        })
      }

      // Special task pages
      for (const task of printData.specialTasks) {
        const taskDueDate = new Date(task.dueDate)
        taskDueDate.setHours(0, 0, 0, 0)
        const daysRemaining = Math.ceil(
          (taskDueDate.getTime() - normalizedDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        previewPages.push({
          type: 'SPECIAL_TASK',
          title: 'Tarefa Especial',
          task: {
            title: task.title,
            description: task.description,
            dueDate: taskDueDate.toLocaleDateString('pt-BR'),
            daysRemaining,
            category: task.category,
            employee: task.employee,
          },
        })
      }

      // One-off task pages
      for (const task of printData.oneOffTasks) {
        const taskDueDate = new Date(task.dueDate)
        taskDueDate.setHours(0, 0, 0, 0)
        const daysRemaining = Math.ceil(
          (taskDueDate.getTime() - normalizedDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        previewPages.push({
          type: 'SPECIAL_TASK',
          title: 'Tarefa Avulsa',
          task: {
            title: task.title,
            description: task.description,
            dueDate: taskDueDate.toLocaleDateString('pt-BR'),
            daysRemaining,
            category: task.category,
            employee: task.employee,
          },
        })
      }

      const formattedDate = date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })

      // Generate ESC/POS and convert to HTML using the printData.pages
      let previewHtml = ''
      if (printData.pages.length > 0) {
        const escPosData = formatMultiPageDaily({
          houseName: settings.houseName,
          date,
          pages: printData.pages,
          showNotesSection: settings.showNotesSection,
        })
        previewHtml = escPosToHtml(escPosData)
      }

      return NextResponse.json({
        type: 'DAILY_TASKS',
        houseName: settings.houseName,
        date: formattedDate,
        pages: previewPages,
        previewHtml,
        totalTasks: printData.taskCount,
        totalSpecialTasks: printData.specialTaskCount,
        totalOneOffTasks: printData.oneOffTaskCount,
        hasMenu: printData.hasMenu,
      })
    }

    if (type === 'WEEKLY_MENU') {
      // Get week start (Monday)
      const weekStart = new Date(date)
      const dayNum = weekStart.getDay()
      const diff = dayNum === 0 ? -6 : 1 - dayNum
      weekStart.setDate(weekStart.getDate() + diff)

      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      // Get settings and menu data in parallel
      const [settings, daysData] = await Promise.all([
        getPrinterSettings(),
        getWeeklyMenuData(weekStart),
      ])

      // Build days array for JSON response
      const days = daysData.map((day) => ({
        date: day.date.toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: '2-digit',
          month: '2-digit',
        }),
        lunch: day.lunch ?? null,
        dinner: day.dinner ?? null,
      }))

      const periodStr = `${weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${weekEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`

      // Generate ESC/POS and convert to HTML
      const escPosData = formatWeeklyMenuPage(settings.houseName, weekStart, daysData)
      const previewHtml = escPosToHtml(escPosData)

      return NextResponse.json({
        type: 'WEEKLY_MENU',
        houseName: settings.houseName,
        period: periodStr,
        days,
        previewHtml,
      })
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  } catch (error) {
    console.error('Error generating print preview:', error)
    return NextResponse.json({ error: 'Erro ao gerar preview' }, { status: 500 })
  }
}
