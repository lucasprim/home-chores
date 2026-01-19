import { NextRequest, NextResponse } from 'next/server'
import { getTasksForDate } from '@/lib/task-scheduler'

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

    // Validate date format
    const [year, month, day] = dateParam.split('-').map(Number)
    if (!year || !month || !day) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
    }

    const result = await getTasksForDate(dateParam, {
      employeeId: employeeId || undefined,
    })

    return NextResponse.json({
      date: result.date,
      tasks: result.tasks,
      specialTasks: result.specialTasks,
      oneOffTasks: result.oneOffTasks,
    })
  } catch (error) {
    console.error('Error fetching tasks for date:', error)
    return NextResponse.json({ error: 'Erro ao buscar tarefas do dia' }, { status: 500 })
  }
}
