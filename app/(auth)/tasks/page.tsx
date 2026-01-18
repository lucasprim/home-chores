'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button, Card, CardContent, Badge, Modal, Input, DropdownMenu } from '@/components/ui'
import { Category, Role } from '@prisma/client'
import { rruleToReadable, createDailyRule, createWeekdaysRule, createWeeklyRule, createMonthlyRule, parseRuleToPreset, getRecurrenceFrequencyPriority } from '@/lib/rrule-utils'
import { RecurrenceDialog, configToReadable, parseRruleToConfig, RecurrenceConfig } from '@/components/recurrence-dialog'

interface Employee {
  id: string
  name: string
  role: Role
}

interface Task {
  id: string
  title: string
  description: string | null
  category: Category
  rrule: string
  employeeId: string | null
  employee: Employee | null
  active: boolean
}

interface SpecialTask {
  id: string
  title: string
  description: string | null
  category: Category
  rrule: string
  dueDays: number
  employeeId: string | null
  employee: Employee | null
  active: boolean
}

type TabType = 'recurring' | 'special'

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
  const [activeTab, setActiveTab] = useState<TabType>('recurring')
  const [tasks, setTasks] = useState<Task[]>([])
  const [specialTasks, setSpecialTasks] = useState<SpecialTask[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editingSpecialTask, setEditingSpecialTask] = useState<SpecialTask | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<Category | ''>('')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<Category>>(new Set())
  const [employeeFilter, setEmployeeFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/tasks')
      if (!res.ok) throw new Error('Erro ao carregar tarefas')
      const data = await res.json()
      setTasks(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSpecialTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (showInactive) params.set('includeInactive', 'true')
      const res = await fetch(`/api/special-tasks?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar tarefas especiais')
      const data = await res.json()
      setSpecialTasks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
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
    fetchSpecialTasks()
    fetchEmployees()
  }, [fetchTasks, fetchSpecialTasks, fetchEmployees])

  const handleAdd = () => {
    setEditingTask(null)
    setEditingSpecialTask(null)
    setIsModalOpen(true)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setEditingSpecialTask(null)
    setIsModalOpen(true)
  }

  const handleEditSpecialTask = (task: SpecialTask) => {
    setEditingTask(null)
    setEditingSpecialTask(task)
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

  const handleToggleSpecialTaskActive = async (task: SpecialTask) => {
    try {
      const res = await fetch(`/api/special-tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !task.active }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar tarefa')
      await fetchSpecialTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar')
    }
  }

  const handleDeleteSpecialTask = async (task: SpecialTask) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa especial?')) return
    try {
      const res = await fetch(`/api/special-tasks/${task.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Erro ao excluir tarefa')
      await fetchSpecialTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir')
    }
  }

  const handleFormSubmit = async () => {
    await fetchTasks()
    await fetchSpecialTasks()
    setIsModalOpen(false)
  }

  const filteredTasks = tasks.filter((task) => {
    if (!showInactive && !task.active) return false
    if (categoryFilter && task.category !== categoryFilter) return false
    if (employeeFilter && task.employeeId !== employeeFilter) return false
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const filteredSpecialTasks = specialTasks.filter((task) => {
    if (!showInactive && !task.active) return false
    if (categoryFilter && task.category !== categoryFilter) return false
    if (employeeFilter && task.employeeId !== employeeFilter) return false
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // Group tasks by category, sorted by frequency within each category
  const groupedTasks = useMemo(() => {
    // First, sort all filtered tasks by frequency, then alphabetically
    const sorted = [...filteredTasks].sort((a, b) => {
      const freqA = getRecurrenceFrequencyPriority(a.rrule)
      const freqB = getRecurrenceFrequencyPriority(b.rrule)
      if (freqA !== freqB) return freqA - freqB
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

  // Group special tasks by category
  const groupedSpecialTasks = useMemo(() => {
    // Sort by frequency, then alphabetically
    const sorted = [...filteredSpecialTasks].sort((a, b) => {
      const freqA = getRecurrenceFrequencyPriority(a.rrule)
      const freqB = getRecurrenceFrequencyPriority(b.rrule)
      if (freqA !== freqB) return freqA - freqB
      return a.title.localeCompare(b.title, 'pt-BR')
    })

    // Group by category
    const groups = new Map<Category, SpecialTask[]>()
    for (const task of sorted) {
      const existing = groups.get(task.category) || []
      groups.set(task.category, [...existing, task])
    }

    // Return in CATEGORY_ORDER, filtering empty categories
    return CATEGORY_ORDER
      .filter(cat => groups.has(cat))
      .map(cat => ({ category: cat, tasks: groups.get(cat)! }))
  }, [filteredSpecialTasks])

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
          onClick={() => setActiveTab('recurring')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'recurring'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Recorrentes ({tasks.filter(t => showInactive || t.active).length})
        </button>
        <button
          onClick={() => setActiveTab('special')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'special'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Especiais ({filteredSpecialTasks.length})
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
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

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4"
          />
          Mostrar inativas
        </label>
      </div>

      {/* Recurring Tasks Tab */}
      {activeTab === 'recurring' && (
        <>
          {loading ? (
            <div className="text-center py-8 text-[var(--muted-foreground)]">Carregando...</div>
          ) : filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-[var(--muted-foreground)]">
                  {tasks.length === 0
                    ? 'Nenhuma tarefa recorrente cadastrada ainda.'
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
                            `}
                          >
                            <div className="flex-1 min-w-0 flex items-center gap-1.5">
                              <span className="font-medium truncate">{task.title}</span>
                              <span className="text-xs text-[var(--muted-foreground)] truncate hidden sm:inline">
                                · {task.employee?.name || 'Sem atrib.'} · {rruleToReadable(task.rrule)}
                              </span>
                              {!task.active && <Badge variant="warning" className="text-xs px-1.5 py-0">Inativa</Badge>}
                            </div>
                            <DropdownMenu
                              items={[
                                { label: 'Editar', onClick: () => handleEditTask(task) },
                                { label: task.active ? 'Desativar' : 'Ativar', onClick: () => handleToggleActive(task) },
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

      {/* Special Tasks Tab */}
      {activeTab === 'special' && (
        <>
          <p className="text-sm text-[var(--muted-foreground)]">
            Tarefas com prazo para conclusão. Quando aparecem na agenda, têm um número de dias para serem concluídas.
          </p>

          {filteredSpecialTasks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-[var(--muted-foreground)]">
                  {specialTasks.length === 0
                    ? 'Nenhuma tarefa especial cadastrada ainda.'
                    : 'Nenhuma tarefa encontrada com os filtros selecionados.'}
                </p>
                {specialTasks.length === 0 && (
                  <Button onClick={handleAdd} className="mt-4">
                    Cadastrar primeira tarefa especial
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {groupedSpecialTasks.map(({ category, tasks: categoryTasks }) => {
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
                            `}
                          >
                            <div className="flex-1 min-w-0 flex items-center gap-1.5">
                              <span className="font-medium truncate">{task.title}</span>
                              <span className="text-xs text-[var(--muted-foreground)] truncate hidden sm:inline">
                                · {task.employee?.name || 'Sem atrib.'} · {task.dueDays}d
                              </span>
                              {!task.active && <Badge variant="warning" className="text-xs px-1.5 py-0">Inativa</Badge>}
                            </div>
                            <DropdownMenu
                              items={[
                                { label: 'Editar', onClick: () => handleEditSpecialTask(task) },
                                { label: task.active ? 'Desativar' : 'Ativar', onClick: () => handleToggleSpecialTaskActive(task) },
                                { label: 'Excluir', onClick: () => handleDeleteSpecialTask(task), variant: 'destructive' },
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

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? 'Editar Tarefa' : editingSpecialTask ? 'Editar Tarefa Especial' : 'Nova Tarefa'}
      >
        <TaskForm
          task={editingTask}
          specialTask={editingSpecialTask}
          employees={employees}
          defaultTab={activeTab}
          onSuccess={handleFormSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  )
}

interface TaskFormProps {
  task: Task | null
  specialTask: SpecialTask | null
  employees: Employee[]
  defaultTab: TabType
  onSuccess: () => void
  onCancel: () => void
}

type RecurrenceType = 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'custom'

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function TaskForm({ task, specialTask, employees, defaultTab, onSuccess, onCancel }: TaskFormProps) {
  // Determine initial task type based on what's being edited
  const initialIsSpecial = specialTask !== null || (task === null && specialTask === null && defaultTab === 'special')

  const [isSpecial, setIsSpecial] = useState(initialIsSpecial)
  const [title, setTitle] = useState(task?.title ?? specialTask?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? specialTask?.description ?? '')
  const [category, setCategory] = useState<Category>(task?.category ?? specialTask?.category ?? 'LIMPEZA')
  const [employeeId, setEmployeeId] = useState(task?.employeeId ?? specialTask?.employeeId ?? '')
  const [active, setActive] = useState(task?.active ?? specialTask?.active ?? true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Recurrence state (for both regular and special tasks now)
  const rruleSource = task?.rrule ?? specialTask?.rrule
  const parsed = rruleSource ? parseRuleToPreset(rruleSource) : { type: 'daily' as RecurrenceType }
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(parsed.type)
  const [weeklyDays, setWeeklyDays] = useState<number[]>(parsed.days ?? [0, 1, 2, 3, 4])
  const [monthDay, setMonthDay] = useState(parsed.monthDay ?? 1)
  const [customRrule, setCustomRrule] = useState(parsed.type === 'custom' ? rruleSource ?? '' : '')
  const [showRecurrenceDialog, setShowRecurrenceDialog] = useState(false)
  const [customConfig, setCustomConfig] = useState<RecurrenceConfig | null>(
    parsed.type === 'custom' && rruleSource ? parseRruleToConfig(rruleSource) : null
  )

  // Special task state
  const [dueDays, setDueDays] = useState(specialTask?.dueDays ?? 7)

  // Disable type switching when editing
  const isEditing = task !== null || specialTask !== null

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
      const rrule = getRrule()

      if (isSpecial) {
        // Create/update special task
        const url = specialTask ? `/api/special-tasks/${specialTask.id}` : '/api/special-tasks'
        const method = specialTask ? 'PUT' : 'POST'

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description: description || null,
            category,
            employeeId: employeeId || null,
            rrule,
            dueDays,
            active,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Erro ao salvar')
        }
      } else {
        // Create/update recurring task
        const url = task ? `/api/tasks/${task.id}` : '/api/tasks'
        const method = task ? 'PUT' : 'POST'

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description: description || null,
            category,
            employeeId: employeeId || null,
            rrule,
            active,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Erro ao salvar')
        }
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
              onClick={() => setIsSpecial(false)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !isSpecial
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'bg-[var(--secondary)] text-[var(--secondary-foreground)]'
              }`}
            >
              Recorrente
            </button>
            <button
              type="button"
              onClick={() => setIsSpecial(true)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isSpecial
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'bg-[var(--secondary)] text-[var(--secondary-foreground)]'
              }`}
            >
              Especial (com prazo)
            </button>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {isSpecial
              ? 'Tarefa com prazo para conclusão. Quando aparece na agenda, tem X dias para ser concluída.'
              : 'Tarefa que deve ser concluída no mesmo dia em que aparece.'}
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Título *</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isSpecial ? 'Ex: Limpar filtros do ar-condicionado' : 'Ex: Limpar cozinha'}
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

      {/* Recurrence (for both task types) */}
      <div>
        <label className="block text-sm font-medium mb-2">
          {isSpecial ? 'Quando aparece na agenda *' : 'Recorrência *'}
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

      {/* Special task: Due Days */}
      {isSpecial && (
        <div>
          <label className="block text-sm font-medium mb-1">Prazo para conclusão (dias) *</label>
          <input
            type="number"
            min={1}
            max={365}
            value={dueDays}
            onChange={(e) => setDueDays(parseInt(e.target.value) || 7)}
            className="w-24 h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)]"
          />
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Quando a tarefa aparece na agenda, terá {dueDays} dia{dueDays > 1 ? 's' : ''} para ser concluída.
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
          {submitting ? 'Salvando...' : (task || specialTask) ? 'Salvar' : 'Criar'}
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
