'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button, Card, CardContent, Badge, Modal, Input, DropdownMenu } from '@/components/ui'
import { Category, Role, TaskType } from '@prisma/client'
import { rruleToReadable, createDailyRule, createWeekdaysRule, createWeeklyRule, createMonthlyRule, parseRuleToPreset, getRecurrenceFrequencyPriority } from '@/lib/rrule-utils'
import { RecurrenceDialog, configToReadable, parseRruleToConfig, RecurrenceConfig } from '@/components/recurrence-dialog'

interface Employee {
  id: string
  name: string
  role: Role
  workDays: number[]
}

interface Task {
  id: string
  title: string
  description: string | null
  category: Category
  taskType: TaskType
  rrule: string | null
  dueDays: number | null
  printedAt: string | null
  startDate: string | null
  employeeId: string | null
  employee: Employee | null
  active: boolean
  createdAt: string
}

type TabType = 'active' | 'archive'
type TypeFilter = '' | 'RECURRING' | 'SPECIAL' | 'ONE_OFF'

const CATEGORY_LABELS: Record<Category, string> = {
  LIMPEZA: 'Limpeza',
  COZINHA: 'Cozinha',
  LAVANDERIA: 'Lavanderia',
  ORGANIZACAO: 'Organização',
  COMPRAS: 'Compras',
  MANUTENCAO: 'Manutenção',
  JARDIM: 'Jardim',
  CRIANCAS: 'Crianças',
  PETS: 'Pets',
  OUTRO: 'Outro',
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

const TYPE_LABELS: Record<TaskType, string> = {
  RECURRING: 'Recorrente',
  SPECIAL: 'Especial',
  ONE_OFF: 'Avulsa',
}

const TYPE_ICONS: Record<TaskType, string> = {
  RECURRING: '🔄',
  SPECIAL: '⭐',
  ONE_OFF: '📌',
}

// Logical category ordering: cleaning domain → food domain → home domain → care domain → other
const CATEGORY_ORDER: Category[] = [
  'LIMPEZA', 'LAVANDERIA', 'ORGANIZACAO',  // Cleaning domain
  'COZINHA', 'COMPRAS',                     // Food domain
  'JARDIM', 'MANUTENCAO',                   // Home domain
  'CRIANCAS', 'PETS',                       // Care domain
  'OUTRO',                                  // Always last
]

// Color scheme for each category (tailwind-compatible classes)
const CATEGORY_COLORS: Record<Category, { border: string; bg: string; text: string }> = {
  LIMPEZA: { border: 'border-l-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-300' },
  LAVANDERIA: { border: 'border-l-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-700 dark:text-purple-300' },
  ORGANIZACAO: { border: 'border-l-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300' },
  COZINHA: { border: 'border-l-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-700 dark:text-orange-300' },
  COMPRAS: { border: 'border-l-teal-500', bg: 'bg-teal-50 dark:bg-teal-950/30', text: 'text-teal-700 dark:text-teal-300' },
  MANUTENCAO: { border: 'border-l-slate-500', bg: 'bg-slate-50 dark:bg-slate-800/30', text: 'text-slate-700 dark:text-slate-300' },
  JARDIM: { border: 'border-l-green-500', bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-300' },
  CRIANCAS: { border: 'border-l-pink-500', bg: 'bg-pink-50 dark:bg-pink-950/30', text: 'text-pink-700 dark:text-pink-300' },
  PETS: { border: 'border-l-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/30', text: 'text-rose-700 dark:text-rose-300' },
  OUTRO: { border: 'border-l-gray-500', bg: 'bg-gray-50 dark:bg-gray-800/30', text: 'text-gray-700 dark:text-gray-300' },
}

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState<TabType>('active')
  const [tasks, setTasks] = useState<Task[]>([])
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('')
  const [categoryFilter, setCategoryFilter] = useState<Category | ''>('')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<Category>>(new Set())
  const [employeeFilter, setEmployeeFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      // Fetch active tasks and archived tasks in parallel
      const params = new URLSearchParams()
      if (showInactive) params.set('includeInactive', 'true')

      const [activeRes, archivedRes] = await Promise.all([
        fetch(`/api/tasks?${params}`),
        fetch('/api/tasks?type=ONE_OFF&includePrinted=true&includeInactive=true')
      ])

      if (!activeRes.ok) throw new Error('Erro ao carregar tarefas')
      if (!archivedRes.ok) throw new Error('Erro ao carregar arquivo')

      const activeData = await activeRes.json()
      const archivedData = await archivedRes.json()

      // Filter active tasks (exclude printed ONE_OFF which are in archived)
      const active = activeData.filter((task: Task) =>
        !(task.taskType === 'ONE_OFF' && task.printedAt)
      )

      // Filter archived tasks (only printed ONE_OFF)
      const archived = archivedData.filter((t: Task) => t.printedAt)

      setTasks(active)
      setArchivedTasks(archived)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [showInactive])

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees')
      if (res.ok) {
        const data = await res.json()
        setEmployees(data.filter((e: Employee & { active: boolean }) => e.active))
      }
    } catch {
      // Ignore errors
    }
  }, [])

  useEffect(() => {
    fetchTasks()
    fetchEmployees()
  }, [fetchTasks, fetchEmployees])

  // Also fetch archived tasks when tab changes
  useEffect(() => {
    if (activeTab === 'archive') {
      const fetchArchived = async () => {
        try {
          const res = await fetch('/api/tasks?type=ONE_OFF&includePrinted=true&includeInactive=true')
          if (!res.ok) throw new Error('Erro ao carregar arquivo')
          const data = await res.json()
          setArchivedTasks(data.filter((t: Task) => t.printedAt))
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erro desconhecido')
        }
      }
      fetchArchived()
    }
  }, [activeTab])

  const handleAdd = () => {
    setEditingTask(null)
    setIsModalOpen(true)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setIsModalOpen(true)
  }

  const handleToggleActive = async (task: Task) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !task.active }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar tarefa')
      await fetchTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar')
    }
  }

  const handleDeleteTask = async (task: Task) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Erro ao excluir tarefa')
      await fetchTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir')
    }
  }

  const handleResetPrinted = async (task: Task) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetPrinted: true }),
      })
      if (!res.ok) throw new Error('Erro ao reimprimir tarefa')
      await fetchTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao reimprimir')
    }
  }

  const handleFormSubmit = async () => {
    await fetchTasks()
    setIsModalOpen(false)
  }

  const filteredTasks = tasks.filter((task) => {
    if (!showInactive && !task.active) return false
    if (typeFilter && task.taskType !== typeFilter) return false
    if (categoryFilter && task.category !== categoryFilter) return false
    if (employeeFilter && task.employeeId !== employeeFilter) return false
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const filteredArchivedTasks = archivedTasks.filter((task) => {
    if (categoryFilter && task.category !== categoryFilter) return false
    if (employeeFilter && task.employeeId !== employeeFilter) return false
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const pendingOneOffCount = tasks.filter((t) => t.taskType === 'ONE_OFF' && t.active && !t.printedAt).length
  const activeCount = filteredTasks.length
  const archiveCount = filteredArchivedTasks.length

  // Group tasks by category
  const groupedTasks = useMemo(() => {
    // Sort by frequency (for recurring tasks), then alphabetically
    const sorted = [...filteredTasks].sort((a, b) => {
      if (a.rrule && b.rrule) {
        const freqA = getRecurrenceFrequencyPriority(a.rrule)
        const freqB = getRecurrenceFrequencyPriority(b.rrule)
        if (freqA !== freqB) return freqA - freqB
      }
      return a.title.localeCompare(b.title, 'pt-BR')
    })

    // Group by category
    const groups = new Map<Category, Task[]>()
    for (const task of sorted) {
      const existing = groups.get(task.category) || []
      groups.set(task.category, [...existing, task])
    }

    // Return in CATEGORY_ORDER, filtering empty categories
    return CATEGORY_ORDER
      .filter(cat => groups.has(cat))
      .map(cat => ({ category: cat, tasks: groups.get(cat)! }))
  }, [filteredTasks])

  const getTaskSecondaryInfo = (task: Task): string => {
    const parts: string[] = []
    parts.push(task.employee?.name || 'Sem atrib.')

    if (task.taskType === 'ONE_OFF') {
      parts.push(`${task.dueDays ?? 7}d`)
    } else if (task.taskType === 'SPECIAL') {
      parts.push(`${task.dueDays ?? 7}d`)
      if (task.rrule) parts.push(rruleToReadable(task.rrule))
    } else if (task.rrule) {
      parts.push(rruleToReadable(task.rrule))
    }

    // Show start date if set (for RECURRING and SPECIAL)
    if (task.startDate && (task.taskType === 'RECURRING' || task.taskType === 'SPECIAL')) {
      const startDate = new Date(task.startDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      startDate.setHours(0, 0, 0, 0)
      if (startDate > today) {
        parts.push(`inicia ${startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`)
      }
    }

    return parts.join(' · ')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tarefas</h1>
        <Button onClick={handleAdd}>+ Nova Tarefa</Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'active'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Ativas ({activeCount})
          {pendingOneOffCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-orange-500 text-white">
              {pendingOneOffCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('archive')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'archive'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Arquivo ({archiveCount})
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {activeTab === 'active' && (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
          >
            <option value="">Todos os tipos</option>
            <option value="RECURRING">🔄 Recorrentes</option>
            <option value="SPECIAL">⭐ Especiais</option>
            <option value="ONE_OFF">📌 Avulsas</option>
          </select>
        )}

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as Category | '')}
          className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
        >
          <option value="">Todas categorias</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {CATEGORY_ICONS[value as Category]} {label}
            </option>
          ))}
        </select>

        <select
          value={employeeFilter}
          onChange={(e) => setEmployeeFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
        >
          <option value="">Todos funcionários</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>

        <Input
          placeholder="Buscar..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 w-40"
        />

        {activeTab === 'active' && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4"
            />
            Mostrar inativas
          </label>
        )}
      </div>

      {/* Active Tasks Tab */}
      {activeTab === 'active' && (
        <>
          {loading ? (
            <div className="text-center py-8 text-[var(--muted-foreground)]">Carregando...</div>
          ) : filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-[var(--muted-foreground)]">
                  {tasks.length === 0
                    ? 'Nenhuma tarefa cadastrada ainda.'
                    : 'Nenhuma tarefa encontrada com os filtros selecionados.'}
                </p>
                {tasks.length === 0 && (
                  <Button onClick={handleAdd} className="mt-4">
                    Cadastrar primeira tarefa
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {groupedTasks.map(({ category, tasks: categoryTasks }) => {
                const colors = CATEGORY_COLORS[category]
                const isCollapsed = collapsedCategories.has(category)
                return (
                  <Card key={category} className={`overflow-hidden border-l-4 ${colors.border}`}>
                    {/* Category Header - Clickable */}
                    <button
                      type="button"
                      onClick={() => {
                        setCollapsedCategories(prev => {
                          const next = new Set(prev)
                          if (next.has(category)) {
                            next.delete(category)
                          } else {
                            next.add(category)
                          }
                          return next
                        })
                      }}
                      className={`w-full px-4 py-2.5 ${colors.bg} ${!isCollapsed ? 'border-b border-[var(--border)]' : ''} hover:opacity-80 transition-opacity`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm transition-transform ${isCollapsed ? '' : 'rotate-90'}`}>▶</span>
                          <span className="text-lg">{CATEGORY_ICONS[category]}</span>
                          <span className={`font-semibold ${colors.text}`}>
                            {CATEGORY_LABELS[category]}
                          </span>
                        </div>
                        <span className={`text-sm ${colors.text} opacity-75`}>
                          ({categoryTasks.length})
                        </span>
                      </div>
                    </button>
                    {/* Tasks List - Collapsible */}
                    {!isCollapsed && (
                      <div className="divide-y divide-[var(--border)]">
                        {categoryTasks.map((task) => (
                          <div
                            key={task.id}
                            className={`
                              flex items-center gap-2 px-4 py-2.5
                              hover:bg-[var(--secondary)] transition-colors
                              ${!task.active ? 'opacity-50' : ''}
                              ${task.taskType === 'ONE_OFF' && !task.printedAt ? 'bg-orange-50/50 dark:bg-orange-950/20' : ''}
                            `}
                          >
                            <div className="flex-1 min-w-0 flex items-center gap-1.5">
                              <span className="text-xs" title={TYPE_LABELS[task.taskType]}>
                                {TYPE_ICONS[task.taskType]}
                              </span>
                              <span className="font-medium truncate">{task.title}</span>
                              <span className="text-xs text-[var(--muted-foreground)] truncate hidden sm:inline">
                                · {getTaskSecondaryInfo(task)}
                              </span>
                              {task.taskType === 'ONE_OFF' && !task.printedAt && (
                                <Badge className="text-xs px-1.5 py-0 bg-orange-500 text-white">Pendente</Badge>
                              )}
                              {!task.active && <Badge variant="warning" className="text-xs px-1.5 py-0">Inativa</Badge>}
                            </div>
                            <DropdownMenu
                              items={[
                                { label: 'Editar', onClick: () => handleEditTask(task) },
                                { label: task.active ? 'Desativar' : 'Ativar', onClick: () => handleToggleActive(task) },
                                { label: 'Excluir', onClick: () => handleDeleteTask(task), variant: 'destructive' },
                              ]}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Archive Tab */}
      {activeTab === 'archive' && (
        <>
          <p className="text-sm text-[var(--muted-foreground)]">
            Tarefas avulsas já impressas. Use &quot;Reimprimir&quot; para colocá-las novamente na fila de impressão.
          </p>

          {filteredArchivedTasks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-[var(--muted-foreground)]">
                  Nenhuma tarefa arquivada.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredArchivedTasks.map((task) => (
                <Card
                  key={task.id}
                  className="border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/20"
                >
                  <CardContent className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0 flex items-center gap-1.5">
                        <span className="text-lg">{CATEGORY_ICONS[task.category]}</span>
                        <span className="font-medium truncate">{task.title}</span>
                        <span className="text-xs text-[var(--muted-foreground)] truncate hidden sm:inline">
                          · {task.employee?.name || 'Sem atrib.'} · {task.dueDays ?? 7}d
                        </span>
                        <Badge variant="success" className="text-xs px-1.5 py-0">
                          Impresso {task.printedAt && new Date(task.printedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </Badge>
                      </div>
                      <DropdownMenu
                        items={[
                          { label: 'Reimprimir', onClick: () => handleResetPrinted(task) },
                          { label: 'Excluir', onClick: () => handleDeleteTask(task), variant: 'destructive' },
                        ]}
                      />
                    </div>
                    {task.description && (
                      <p className="text-sm text-[var(--muted-foreground)] mt-1 ml-7">
                        {task.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
      >
        <TaskForm
          task={editingTask}
          employees={employees}
          defaultType={typeFilter || undefined}
          onSuccess={handleFormSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  )
}

interface TaskFormProps {
  task: Task | null
  employees: Employee[]
  defaultType?: TaskType
  onSuccess: () => void
  onCancel: () => void
}

type RecurrenceType = 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'custom'

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function TaskForm({ task, employees, defaultType, onSuccess, onCancel }: TaskFormProps) {
  const [taskType, setTaskType] = useState<TaskType>(task?.taskType ?? defaultType ?? 'RECURRING')
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [category, setCategory] = useState<Category>(task?.category ?? 'LIMPEZA')
  const [employeeId, setEmployeeId] = useState(task?.employeeId ?? '')
  const [active, setActive] = useState(task?.active ?? true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Start date state (for RECURRING and SPECIAL tasks)
  const [startDate, setStartDate] = useState<string>(
    task?.startDate ? new Date(task.startDate).toISOString().split('T')[0]! : ''
  )

  // Recurrence state
  const parsed = task?.rrule ? parseRuleToPreset(task.rrule) : { type: 'daily' as RecurrenceType }
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(parsed.type)
  const [weeklyDays, setWeeklyDays] = useState<number[]>(parsed.days ?? [0, 1, 2, 3, 4])
  const [monthDay, setMonthDay] = useState(parsed.monthDay ?? 1)
  const [customRrule, setCustomRrule] = useState(parsed.type === 'custom' ? task?.rrule ?? '' : '')
  const [showRecurrenceDialog, setShowRecurrenceDialog] = useState(false)
  const [customConfig, setCustomConfig] = useState<RecurrenceConfig | null>(
    parsed.type === 'custom' && task?.rrule ? parseRruleToConfig(task.rrule) : null
  )

  // Due days (for SPECIAL and ONE_OFF)
  const [dueDays, setDueDays] = useState(task?.dueDays ?? 7)

  // Disable type switching when editing
  const isEditing = task !== null

  const getRrule = (): string => {
    switch (recurrenceType) {
      case 'daily':
        return createDailyRule()
      case 'weekdays':
        return createWeekdaysRule()
      case 'weekly':
        return createWeeklyRule(weeklyDays)
      case 'monthly':
        return createMonthlyRule(monthDay)
      case 'custom':
        return customRrule
      default:
        return createDailyRule()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const url = task ? `/api/tasks/${task.id}` : '/api/tasks'
      const method = task ? 'PUT' : 'POST'

      const body: Record<string, unknown> = {
        title,
        description: description || null,
        category,
        employeeId: employeeId || null,
        taskType,
        active,
      }

      // Add rrule for RECURRING and SPECIAL
      if (taskType === 'RECURRING' || taskType === 'SPECIAL') {
        body.rrule = getRrule()
        // Add startDate if set
        body.startDate = startDate || null
      }

      // Add dueDays for SPECIAL and ONE_OFF
      if (taskType === 'SPECIAL' || taskType === 'ONE_OFF') {
        body.dueDays = dueDays
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleWeeklyDay = (day: number) => {
    setWeeklyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    )
  }

  const handleRecurrenceConfirm = (rrule: string, config: RecurrenceConfig) => {
    setCustomRrule(rrule)
    setCustomConfig(config)
    setRecurrenceType('custom')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 text-sm">
          {error}
        </div>
      )}

      {/* Task Type Toggle (only for new tasks) */}
      {!isEditing && (
        <div>
          <label className="block text-sm font-medium mb-2">Tipo de tarefa</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTaskType('RECURRING')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                taskType === 'RECURRING'
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'bg-[var(--secondary)] text-[var(--secondary-foreground)]'
              }`}
            >
              🔄 Recorrente
            </button>
            <button
              type="button"
              onClick={() => setTaskType('SPECIAL')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                taskType === 'SPECIAL'
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'bg-[var(--secondary)] text-[var(--secondary-foreground)]'
              }`}
            >
              ⭐ Especial
            </button>
            <button
              type="button"
              onClick={() => setTaskType('ONE_OFF')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                taskType === 'ONE_OFF'
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'bg-[var(--secondary)] text-[var(--secondary-foreground)]'
              }`}
            >
              📌 Avulsa
            </button>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {taskType === 'RECURRING'
              ? 'Tarefa que se repete conforme agendamento.'
              : taskType === 'SPECIAL'
              ? 'Tarefa agendada com prazo para conclusão.'
              : 'Tarefa única que aparece na próxima impressão.'}
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Título *</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={taskType === 'ONE_OFF' ? 'Ex: Desfazer malas da viagem' : taskType === 'SPECIAL' ? 'Ex: Limpar filtros do ar-condicionado' : 'Ex: Limpar cozinha'}
          required
          maxLength={100}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Descrição</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalhes da tarefa (opcional)"
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] resize-none"
          rows={2}
          maxLength={500}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Categoria *</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)]"
        >
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {CATEGORY_ICONS[value as Category]} {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Funcionário responsável</label>
        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)]"
        >
          <option value="">Sem atribuição</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
      </div>

      {/* Recurrence (for RECURRING and SPECIAL tasks) */}
      {(taskType === 'RECURRING' || taskType === 'SPECIAL') && (
        <div>
          <label className="block text-sm font-medium mb-2">
            {taskType === 'SPECIAL' ? 'Quando aparece na agenda *' : 'Recorrência *'}
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="recurrence"
                checked={recurrenceType === 'daily'}
                onChange={() => setRecurrenceType('daily')}
              />
              <span>Diariamente</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="recurrence"
                checked={recurrenceType === 'weekdays'}
                onChange={() => setRecurrenceType('weekdays')}
              />
              <span>Dias úteis (Seg-Sex)</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="recurrence"
                checked={recurrenceType === 'weekly'}
                onChange={() => setRecurrenceType('weekly')}
              />
              <span>Dias específicos</span>
            </label>

            {recurrenceType === 'weekly' && (
              <div className="flex gap-1 flex-wrap ml-6">
                {DAY_LABELS.map((label, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleWeeklyDay(index)}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                      ${
                        weeklyDays.includes(index)
                          ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                          : 'bg-[var(--secondary)] text-[var(--secondary-foreground)]'
                      }
                    `}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="recurrence"
                checked={recurrenceType === 'monthly'}
                onChange={() => setRecurrenceType('monthly')}
              />
              <span>Mensal</span>
            </label>

            {recurrenceType === 'monthly' && (
              <div className="ml-6">
                <label className="text-sm">
                  Dia do mês:{' '}
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={monthDay}
                    onChange={(e) => setMonthDay(parseInt(e.target.value) || 1)}
                    className="w-16 h-8 px-2 rounded border border-[var(--border)] bg-[var(--background)]"
                  />
                </label>
              </div>
            )}

            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="recurrence"
                checked={recurrenceType === 'custom'}
                onChange={() => {
                  if (!customRrule) {
                    setShowRecurrenceDialog(true)
                  } else {
                    setRecurrenceType('custom')
                  }
                }}
              />
              <span>Personalizado...</span>
            </label>

            {recurrenceType === 'custom' && customConfig && (
              <div className="ml-6 p-3 rounded-lg bg-[var(--secondary)] flex items-center justify-between gap-2">
                <span className="text-sm">{configToReadable(customConfig)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRecurrenceDialog(true)}
                >
                  Editar
                </Button>
              </div>
            )}

            {recurrenceType === 'custom' && !customConfig && (
              <div className="ml-6">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowRecurrenceDialog(true)}
                >
                  Configurar recorrência
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Start Date (for RECURRING and SPECIAL tasks) */}
      {(taskType === 'RECURRING' || taskType === 'SPECIAL') && (
        <div>
          <label className="block text-sm font-medium mb-1">Inicia em</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-48 h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)]"
          />
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {startDate
              ? `A tarefa só aparecerá a partir de ${new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR')}.`
              : 'Deixe em branco para começar imediatamente.'}
          </p>
        </div>
      )}

      {/* Due Days (for SPECIAL and ONE_OFF) */}
      {(taskType === 'SPECIAL' || taskType === 'ONE_OFF') && (
        <div>
          <label className="block text-sm font-medium mb-1">Prazo para conclusão (dias)</label>
          <input
            type="number"
            min={0}
            max={365}
            value={dueDays}
            onChange={(e) => setDueDays(e.target.value === '' ? 0 : parseInt(e.target.value))}
            className="w-24 h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)]"
          />
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {dueDays === 0
              ? (taskType === 'ONE_OFF'
                ? 'A tarefa deve ser concluída no mesmo dia da impressão.'
                : 'A tarefa deve ser concluída no mesmo dia em que aparece.')
              : (taskType === 'ONE_OFF'
                ? `A tarefa terá ${dueDays} dia${dueDays > 1 ? 's' : ''} para ser concluída após a impressão.`
                : `Quando a tarefa aparece na agenda, terá ${dueDays} dia${dueDays > 1 ? 's' : ''} para ser concluída.`)}
          </p>
        </div>
      )}

      {/* Active toggle (for editing) */}
      {isEditing && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="active"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="active" className="text-sm">
            Tarefa ativa
          </label>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : task ? 'Salvar' : 'Criar'}
        </Button>
      </div>

      <RecurrenceDialog
        open={showRecurrenceDialog}
        onClose={() => setShowRecurrenceDialog(false)}
        onConfirm={handleRecurrenceConfirm}
        initialRrule={customRrule || undefined}
      />
    </form>
  )
}
