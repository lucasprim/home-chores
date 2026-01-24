import { NextRequest, NextResponse } from 'next/server'
import { markOneOffTasksAsPrinted } from '@/lib/task-scheduler'
import { printWeeklyMenu, printMultiPageDaily } from '@/lib/printer'
import {
  getPrinterSettings,
  buildDailyPrintData,
  getWeeklyMenuData,
} from '@/lib/print-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, date: dateParam, employeeId, includeSpecialTasks = true } = body

    if (!type || !dateParam) {
      return NextResponse.json({ error: 'type e date são obrigatórios' }, { status: 400 })
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

    // Get printer settings
    const settings = await getPrinterSettings()

    if (type === 'DAILY_TASKS') {
      // Build print data using service
      const printData = await buildDailyPrintData(dateParam, {
        employeeId: employeeId || undefined,
        includeSpecialTasks,
      })

      // Check if we have anything to print
      if (!printData.hasSomethingToPrint) {
        return NextResponse.json(
          { error: 'Não há tarefas, cardápio, tarefas especiais ou avulsas para imprimir nesta data' },
          { status: 400 }
        )
      }

      // Print multi-page
      await printMultiPageDaily({
        ip: settings.ip,
        type: settings.type,
        houseName: settings.houseName,
        date,
        pages: printData.pages,
        showNotesSection: settings.showNotesSection,
      })

      // Mark ONE_OFF tasks as printed
      if (printData.oneOffTaskIds.length > 0) {
        await markOneOffTasksAsPrinted(printData.oneOffTaskIds)
      }

      return NextResponse.json({ success: true, message: 'Impresso com sucesso!' })
    }

    if (type === 'WEEKLY_MENU') {
      // Get week start (Monday)
      const weekStart = new Date(date)
      const dayNum = weekStart.getDay()
      const diff = dayNum === 0 ? -6 : 1 - dayNum
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

      return NextResponse.json({ success: true, message: 'Cardápio impresso com sucesso!' })
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao imprimir' },
      { status: 500 }
    )
  }
}
