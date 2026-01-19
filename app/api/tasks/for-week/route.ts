import { NextRequest, NextResponse } from 'next/server'
import { getTasksForWeek } from '@/lib/task-scheduler'

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

    // Validate date format
    const [year, month, day] = dateParam.split('-').map(Number)
    if (!year || !month || !day) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
    }

    const result = await getTasksForWeek(dateParam)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching tasks for week:', error)
    return NextResponse.json({ error: 'Erro ao buscar tarefas da semana' }, { status: 500 })
  }
}
