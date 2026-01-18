'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { Category, Role } from '@prisma/client'

interface Task {
  id: string
  title: string
  description: string | null
  category: Category
  employee: {
    id: string
    name: string
    role: Role
  } | null
}

interface SpecialTask {
  id: string
  title: string
  description: string | null
  category: Category
  dueDays: number
  appearDate: string
  dueDate: string
  employee: {
    id: string
    name: string
    role: Role
  } | null
}

interface OneOffTask {
  id: string
  title: string
  description: string | null
  category: Category
  dueDays: number
  dueDate: string
  employee: {
    id: string
    name: string
    role: Role
  } | null
}

interface TasksForDateResponse {
  date: string
  tasks: Task[]
  specialTasks: SpecialTask[]
  oneOffTasks: OneOffTask[]
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
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
      const parts = dateParam.split('-')
      if (parts.length === 3) {
        const [year, month, day] = parts.map(Number)
        if (year && month && day) {
          return new Date(year, month - 1, day, 12, 0, 0)
        }
      }
    }
    return new Date()
  })

  const [tasks, setTasks] = useState<Task[]>([])
  const [specialTasks, setSpecialTasks] = useState<SpecialTask[]>([])
  const [oneOffTasks, setOneOffTasks] = useState<OneOffTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const dateStr = getDateString(currentDate)

      const res = await fetch(`/api/tasks/for-date?date=${dateStr}`)
      if (!res.ok) throw new Error('Erro ao carregar tarefas')

      const data: TasksForDateResponse = await res.json()
      setTasks(data.tasks)
      setSpecialTasks(data.specialTasks)
      setOneOffTasks(data.oneOffTasks || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [currentDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
    {} as Record<string, { employee: Task['employee']; tasks: Task[] }>
  )

  const groups = Object.values(groupedTasks)
  const totalTasks = tasks.length
  const totalSpecialTasks = specialTasks.length
  const totalOneOffTasks = oneOffTasks.length

  return (
    <div className="space-y-4">
      {/* Header with date navigation */}
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
          disabled={totalTasks === 0 && totalSpecialTasks === 0 && totalOneOffTasks === 0}
        >
          Imprimir
        </Button>
      </div>

      {/* Info banner explaining this is a preview */}
      <div className="p-3 rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200 text-sm">
        Preview do que será impresso para este dia
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-[var(--muted-foreground)]">Carregando...</div>
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
                          <Badge className="bg-orange-500 text-white">Vence: {formatDueDate(task.dueDate)}</Badge>
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

      {(totalTasks > 0 || totalSpecialTasks > 0 || totalOneOffTasks > 0) && (
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
