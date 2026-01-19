'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { Category, Role } from '@prisma/client'
import type { TasksForDateResult, TasksForWeekResult } from '@/lib/task-scheduler'

type ViewMode = 'daily' | 'weekly'

// Re-export for backward compatibility with page.tsx
export type WeeklyScheduleResponse = TasksForWeekResult

const CATEGORY_ICONS: Record<Category, string> = {
  LIMPEZA: '🧹',
  COZINHA: '🍳',
  LAVANDERIA: '🧺',
  ORGANIZACAO: '📦',
  COMPRAS: '🛒',
  MANUTENCAO: '🔧',
  JARDIM: '🌱',
  CRIANCAS: '👶',
  PETS: '🐕',
  OUTRO: '📋',
}

const ROLE_LABELS: Record<Role, string> = {
  FAXINEIRA: 'Faxineira',
  COZINHEIRA: 'Cozinheira',
  BABA: 'Babá',
  JARDINEIRO: 'Jardineiro',
  MOTORISTA: 'Motorista',
  OUTRO: 'Outro',
}

const DAY_NAMES_SHORT: Record<number, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function getDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year!, month! - 1, day!, 12, 0, 0)
}

function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

function formatDueDate(dueDateStr: string): string {
  const [year, month, day] = dueDateStr.split('-').map(Number)
  const dueDate = new Date(year!, month! - 1, day!)
  return dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

interface WeeklyScheduleViewProps {
  schedule: WeeklyScheduleResponse | null
  categoryIcons: Record<Category, string>
  roleLabels: Record<Role, string>
  dayNames: Record<number, string>
}

function WeeklyScheduleView({ schedule, categoryIcons, roleLabels, dayNames }: WeeklyScheduleViewProps) {
  if (!schedule) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-[var(--muted-foreground)]">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    )
  }

  const allSchedules = [
    ...schedule.employees,
    ...(schedule.unassigned ? [schedule.unassigned] : []),
  ]

  const schedulesWithTasks = allSchedules.filter((emp) =>
    emp.days.some((day) => day.tasks.length > 0)
  )

  if (schedulesWithTasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-[var(--muted-foreground)]">Nenhuma tarefa agendada para esta semana</p>
        </CardContent>
      </Card>
    )
  }

  const dayOrder = [1, 2, 3, 4, 5, 6, 0]

  return (
    <div className="space-y-4">
      {schedulesWithTasks.map((emp) => {
        const totalTasks = emp.days.reduce((sum, day) => sum + day.tasks.length, 0)

        return (
          <Card key={emp.id}>
            <CardHeader className="py-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span>
                  {emp.id === 'unassigned'
                    ? 'Sem funcionário atribuído'
                    : `${emp.name} (${roleLabels[emp.role as Role]})`}
                </span>
                <span className="text-sm font-normal text-[var(--muted-foreground)]">
                  {totalTasks} tarefa{totalTasks !== 1 ? 's' : ''} na semana
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-7 gap-1 text-xs">
                {dayOrder.map((dow) => {
                  const worksToday = emp.workDays.includes(dow)
                  return (
                    <div
                      key={`header-${dow}`}
                      className={`text-center font-medium py-1 rounded ${
                        worksToday
                          ? 'bg-[var(--primary)] text-white'
                          : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                      }`}
                    >
                      {dayNames[dow]}
                    </div>
                  )
                })}

                {dayOrder.map((dow) => {
                  const dayData = emp.days.find((d) => d.dayOfWeek === dow)
                  const worksToday = emp.workDays.includes(dow)
                  const tasks = dayData?.tasks || []

                  return (
                    <div
                      key={`cell-${dow}`}
                      className={`min-h-[60px] p-1 rounded border ${
                        worksToday
                          ? 'border-[var(--border)] bg-[var(--background)]'
                          : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50'
                      }`}
                    >
                      {!worksToday ? (
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-2">
                          Folga
                        </div>
                      ) : tasks.length === 0 ? (
                        <div className="text-[10px] text-[var(--muted-foreground)] text-center mt-2">
                          -
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          {tasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-0.5 text-[10px] leading-tight"
                              title={task.title}
                            >
                              <span>{categoryIcons[task.category as Category]}</span>
                              <span className="truncate">{task.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

interface TodayPageClientProps {
  initialDate: string
  initialView: ViewMode
  initialDailyData: TasksForDateResult | null
  initialWeeklyData: WeeklyScheduleResponse | null
}

export function TodayPageClient({
  initialDate,
  initialView,
  initialDailyData,
  initialWeeklyData,
}: TodayPageClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [viewMode, setViewMode] = useState<ViewMode>(initialView)
  const [currentDate, setCurrentDate] = useState(() => parseDate(initialDate))

  // Use initial data - no loading state needed on first render
  const tasks = initialDailyData?.tasks ?? []
  const specialTasks = initialDailyData?.specialTasks ?? []
  const oneOffTasks = initialDailyData?.oneOffTasks ?? []
  const weeklySchedule = initialWeeklyData

  const updateUrl = useCallback((date: Date, view: ViewMode) => {
    const params = new URLSearchParams()
    const dateStr = getDateString(date)
    const isCurrentDay = isToday(date)

    if (!isCurrentDay) {
      params.set('date', dateStr)
    }
    if (view === 'weekly') {
      params.set('view', 'weekly')
    }

    const queryString = params.toString()
    startTransition(() => {
      router.push(queryString ? `/today?${queryString}` : '/today')
    })
  }, [router])

  const navigateDate = (delta: number) => {
    const newDate = new Date(currentDate)
    const actualDelta = viewMode === 'weekly' ? delta * 7 : delta
    newDate.setDate(newDate.getDate() + actualDelta)
    setCurrentDate(newDate)
    updateUrl(newDate, viewMode)
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    updateUrl(today, viewMode)
  }

  const toggleView = (newView: ViewMode) => {
    setViewMode(newView)
    updateUrl(currentDate, newView)
  }

  // Group tasks by employee
  const groupedTasks = tasks.reduce(
    (acc, task) => {
      const key = task.employee?.id ?? 'unassigned'
      if (!acc[key]) {
        acc[key] = {
          employee: task.employee,
          tasks: [],
        }
      }
      acc[key].tasks.push(task)
      return acc
    },
    {} as Record<string, { employee: typeof tasks[0]['employee']; tasks: typeof tasks }>
  )

  const groups = Object.values(groupedTasks)
  const totalTasks = tasks.length
  const totalSpecialTasks = specialTasks.length
  const totalOneOffTasks = oneOffTasks.length

  const formatWeekRange = () => {
    if (!weeklySchedule) return ''
    const [startYear, startMonth, startDay] = weeklySchedule.weekStart.split('-').map(Number)
    const [endYear, endMonth, endDay] = weeklySchedule.weekEnd.split('-').map(Number)
    const start = new Date(startYear!, startMonth! - 1, startDay!)
    const end = new Date(endYear!, endMonth! - 1, endDay!)
    const startStr = start.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
    const endStr = end.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
    return `${startStr} - ${endStr}`
  }

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-[var(--border)] p-1 bg-[var(--background)]">
          <button
            onClick={() => toggleView('daily')}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === 'daily'
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            Diário
          </button>
          <button
            onClick={() => toggleView('weekly')}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === 'weekly'
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            Semanal
          </button>
        </div>
      </div>

      {/* Header with date navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigateDate(-1)} disabled={isPending}>
            ←
          </Button>
          <div className="text-center">
            <h1 className="text-xl font-bold capitalize">
              {isPending ? (
                <span className="opacity-50">...</span>
              ) : viewMode === 'daily' ? (
                isToday(currentDate) ? 'Hoje' : formatDate(currentDate)
              ) : (
                formatWeekRange()
              )}
            </h1>
            {!isToday(currentDate) && (
              <button
                onClick={goToToday}
                className="text-sm text-[var(--primary)] hover:underline"
                disabled={isPending}
              >
                {viewMode === 'daily' ? 'Voltar para hoje' : 'Voltar para esta semana'}
              </button>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigateDate(1)} disabled={isPending}>
            →
          </Button>
        </div>
        {viewMode === 'daily' && (
          <Button
            variant="secondary"
            onClick={() => router.push(`/print?date=${getDateString(currentDate)}`)}
            disabled={totalTasks === 0 && totalSpecialTasks === 0 && totalOneOffTasks === 0}
          >
            Imprimir
          </Button>
        )}
      </div>

      {/* Info banner */}
      <div className="p-3 rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200 text-sm">
        {viewMode === 'daily'
          ? 'Preview do que será impresso para este dia'
          : 'Agenda semanal de tarefas recorrentes por funcionário'}
      </div>

      {isPending ? (
        <div className="text-center py-8 text-[var(--muted-foreground)]">Carregando...</div>
      ) : viewMode === 'weekly' ? (
        <WeeklyScheduleView
          schedule={weeklySchedule}
          categoryIcons={CATEGORY_ICONS}
          roleLabels={ROLE_LABELS}
          dayNames={DAY_NAMES_SHORT}
        />
      ) : (
        <>
          {/* Special Tasks Section */}
          {totalSpecialTasks > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-[var(--muted-foreground)]">
                Tarefas Especiais ({totalSpecialTasks})
              </h2>
              {specialTasks.map((task) => (
                <Card
                  key={task.id}
                  className="border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
                >
                  <CardContent className="py-3">
                    <div className="flex items-start gap-3">
                      <span className="text-lg">⭐</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{task.title}</span>
                          <Badge variant="warning">Vence: {formatDueDate(task.dueDate)}</Badge>
                        </div>
                        {task.description && (
                          <p className="text-sm text-[var(--muted-foreground)] mt-1">
                            {task.description}
                          </p>
                        )}
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                          {task.employee ? task.employee.name : 'Sem atribuição'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* One-off Tasks Section */}
          {totalOneOffTasks > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-[var(--muted-foreground)]">
                Tarefas Avulsas ({totalOneOffTasks})
              </h2>
              {oneOffTasks.map((task) => (
                <Card
                  key={task.id}
                  className="border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/20"
                >
                  <CardContent className="py-3">
                    <div className="flex items-start gap-3">
                      <span className="text-lg">{CATEGORY_ICONS[task.category]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{task.title}</span>
                          <Badge className="bg-orange-500 text-white">
                            Vence: {formatDueDate(task.dueDate)}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-sm text-[var(--muted-foreground)] mt-1">
                            {task.description}
                          </p>
                        )}
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                          {task.employee ? task.employee.name : 'Sem atribuição'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Regular Tasks Section */}
          {totalTasks === 0 && totalSpecialTasks === 0 && totalOneOffTasks === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <div className="text-4xl mb-4">📋</div>
                <p className="text-[var(--muted-foreground)]">Nenhuma tarefa para este dia</p>
                <Button onClick={() => router.push('/tasks')} className="mt-4">
                  Gerenciar tarefas
                </Button>
              </CardContent>
            </Card>
          ) : totalTasks > 0 ? (
            <div className="space-y-4">
              {groups.map((group, index) => (
                <Card key={group.employee?.id ?? `unassigned-${index}`}>
                  <CardHeader className="py-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>
                        {group.employee
                          ? `${group.employee.name} (${ROLE_LABELS[group.employee.role]})`
                          : 'Sem funcionário atribuído'}
                      </span>
                      <span className="text-sm font-normal text-[var(--muted-foreground)]">
                        {group.tasks.length} tarefa{group.tasks.length !== 1 ? 's' : ''}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {group.tasks.map((task) => (
                        <div key={task.id} className="flex items-start gap-3 py-2 -mx-4 px-4">
                          <span className="text-lg">{CATEGORY_ICONS[task.category]}</span>
                          <div className="flex-1 min-w-0">
                            <span>{task.title}</span>
                            {task.description && (
                              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </>
      )}

      {viewMode === 'daily' && (totalTasks > 0 || totalSpecialTasks > 0 || totalOneOffTasks > 0) && (
        <div className="text-center text-sm text-[var(--muted-foreground)]">
          {totalTasks} tarefa{totalTasks !== 1 ? 's' : ''} regular
          {totalTasks !== 1 ? 'es' : ''}
          {totalSpecialTasks > 0 &&
            ` • ${totalSpecialTasks} especial${totalSpecialTasks !== 1 ? 'is' : ''}`}
          {totalOneOffTasks > 0 &&
            ` • ${totalOneOffTasks} avulsa${totalOneOffTasks !== 1 ? 's' : ''}`}
        </div>
      )}
    </div>
  )
}
