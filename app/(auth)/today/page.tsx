'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { Category, Role } from '@prisma/client'

interface TaskOccurrence {
  task: {
    id: string
    title: string
    description: string | null
    category: Category
    employeeId: string | null
    employee: {
      id: string
      name: string
      role: Role
    } | null
  }
  occurrence: {
    id: string
    completed: boolean
    completedAt: string | null
    notes: string | null
  } | null
}

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

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function getDateString(date: Date): string {
  return date.toISOString().split('T')[0] ?? ''
}

function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

export default function TodayPage() {
  return (
    <Suspense fallback={<div className="text-center py-8 text-[var(--muted-foreground)]">Carregando...</div>}>
      <TodayPageContent />
    </Suspense>
  )
}

function TodayPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const dateParam = searchParams.get('date')
  const [currentDate, setCurrentDate] = useState(() => {
    if (dateParam) {
      const parsed = new Date(dateParam)
      return isNaN(parsed.getTime()) ? new Date() : parsed
    }
    return new Date()
  })

  const [occurrences, setOccurrences] = useState<TaskOccurrence[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOccurrences = useCallback(async () => {
    try {
      setLoading(true)
      const dateStr = getDateString(currentDate)
      const res = await fetch(`/api/occurrences?date=${dateStr}`)
      if (!res.ok) throw new Error('Erro ao carregar tarefas')
      const data = await res.json()
      setOccurrences(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [currentDate])

  useEffect(() => {
    fetchOccurrences()
  }, [fetchOccurrences])

  const navigateDate = (delta: number) => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + delta)
    setCurrentDate(newDate)

    const params = new URLSearchParams()
    params.set('date', getDateString(newDate))
    router.replace(`/today?${params.toString()}`)
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    router.replace('/today')
  }

  const toggleTask = async (taskOccurrence: TaskOccurrence) => {
    const { task, occurrence } = taskOccurrence
    const newCompleted = !occurrence?.completed

    // Optimistic update
    setOccurrences((prev) =>
      prev.map((o) =>
        o.task.id === task.id
          ? {
              ...o,
              occurrence: {
                id: occurrence?.id ?? 'temp',
                completed: newCompleted,
                completedAt: newCompleted ? new Date().toISOString() : null,
                notes: occurrence?.notes ?? null,
              },
            }
          : o
      )
    )

    try {
      if (occurrence?.id) {
        const res = await fetch(`/api/occurrences/${occurrence.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: newCompleted }),
        })
        if (!res.ok) throw new Error('Erro ao atualizar')
      } else {
        const res = await fetch('/api/occurrences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: task.id,
            date: getDateString(currentDate),
            completed: newCompleted,
          }),
        })
        if (!res.ok) throw new Error('Erro ao criar')
        // Refresh to get the real occurrence ID
        await fetchOccurrences()
      }
    } catch (err) {
      // Revert optimistic update
      await fetchOccurrences()
      setError(err instanceof Error ? err.message : 'Erro ao atualizar')
    }
  }

  // Group by employee
  const groupedOccurrences = occurrences.reduce(
    (acc, o) => {
      const key = o.task.employee?.id ?? 'unassigned'
      if (!acc[key]) {
        acc[key] = {
          employee: o.task.employee,
          tasks: [],
        }
      }
      acc[key].tasks.push(o)
      return acc
    },
    {} as Record<
      string,
      {
        employee: TaskOccurrence['task']['employee']
        tasks: TaskOccurrence[]
      }
    >
  )

  const groups = Object.values(groupedOccurrences)
  const totalTasks = occurrences.length
  const completedTasks = occurrences.filter((o) => o.occurrence?.completed).length
  const allCompleted = totalTasks > 0 && completedTasks === totalTasks

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigateDate(-1)}>
            ←
          </Button>
          <div className="text-center">
            <h1 className="text-xl font-bold capitalize">
              {isToday(currentDate) ? 'Hoje' : formatDate(currentDate)}
            </h1>
            {!isToday(currentDate) && (
              <button
                onClick={goToToday}
                className="text-sm text-[var(--primary)] hover:underline"
              >
                Voltar para hoje
              </button>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigateDate(1)}>
            →
          </Button>
        </div>
        <Button
          variant="secondary"
          onClick={() => router.push(`/print?date=${getDateString(currentDate)}`)}
          disabled={totalTasks === 0}
        >
          Imprimir
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-[var(--muted-foreground)]">Carregando...</div>
      ) : totalTasks === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-[var(--muted-foreground)]">Nenhuma tarefa para este dia</p>
            <Button onClick={() => router.push('/tasks')} className="mt-4">
              Gerenciar tarefas
            </Button>
          </CardContent>
        </Card>
      ) : allCompleted ? (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="text-4xl mb-4">✅</div>
            <p className="font-medium text-green-600">Todas as tarefas concluídas!</p>
            <p className="text-sm text-[var(--muted-foreground)] mt-2">
              {completedTasks} tarefa{completedTasks !== 1 ? 's' : ''} completada
              {completedTasks !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      ) : (
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
                    {group.tasks.filter((t) => t.occurrence?.completed).length}/{group.tasks.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {group.tasks.map((taskOcc) => (
                    <label
                      key={taskOcc.task.id}
                      className="flex items-start gap-3 cursor-pointer py-2 hover:bg-[var(--secondary)] -mx-4 px-4 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={taskOcc.occurrence?.completed ?? false}
                        onChange={() => toggleTask(taskOcc)}
                        className="w-5 h-5 mt-0.5 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`flex items-center gap-2 ${taskOcc.occurrence?.completed ? 'line-through text-[var(--muted-foreground)]' : ''}`}
                        >
                          <span>{CATEGORY_ICONS[taskOcc.task.category]}</span>
                          <span>{taskOcc.task.title}</span>
                        </div>
                        {taskOcc.task.description && (
                          <p className="text-sm text-[var(--muted-foreground)] mt-1">
                            {taskOcc.task.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalTasks > 0 && !allCompleted && (
        <div className="text-center text-sm text-[var(--muted-foreground)]">
          {completedTasks}/{totalTasks} tarefas concluídas
        </div>
      )}
    </div>
  )
}
