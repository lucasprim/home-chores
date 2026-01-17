'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button, Card, CardContent, Badge, Modal, Input } from '@/components/ui'
import { Category, Role } from '@prisma/client'
import { rruleToReadable, createDailyRule, createWeekdaysRule, createWeeklyRule, createMonthlyRule, parseRuleToPreset } from '@/lib/rrule-utils'

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

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<Category | ''>('')
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

  const handleAdd = () => {
    setEditingTask(null)
    setIsModalOpen(true)
  }

  const handleEdit = (task: Task) => {
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

  const handleFormSubmit = async () => {
    await fetchTasks()
    setIsModalOpen(false)
  }

  const filteredTasks = tasks.filter((task) => {
    if (!showInactive && !task.active) return false
    if (categoryFilter && task.category !== categoryFilter) return false
    if (employeeFilter && task.employeeId !== employeeFilter) return false
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

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
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <Card key={task.id} className={!task.active ? 'opacity-60' : ''}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{CATEGORY_ICONS[task.category]}</span>
                    <span className="font-medium truncate">{task.title}</span>
                    {!task.active && <Badge variant="warning">Inativa</Badge>}
                  </div>
                  <div className="text-sm text-[var(--muted-foreground)] mt-1">
                    {task.employee ? task.employee.name : 'Sem atribuição'} •{' '}
                    {rruleToReadable(task.rrule)}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(task)}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggleActive(task)}>
                    {task.active ? 'Desativar' : 'Ativar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
      >
        <TaskForm
          task={editingTask}
          employees={employees}
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
  onSuccess: () => void
  onCancel: () => void
}

type RecurrenceType = 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'custom'

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function TaskForm({ task, employees, onSuccess, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [category, setCategory] = useState<Category>(task?.category ?? 'LIMPEZA')
  const [employeeId, setEmployeeId] = useState(task?.employeeId ?? '')
  const [active, setActive] = useState(task?.active ?? true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Recurrence state
  const parsed = task ? parseRuleToPreset(task.rrule) : { type: 'daily' as RecurrenceType }
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(parsed.type)
  const [weeklyDays, setWeeklyDays] = useState<number[]>(parsed.days ?? [0, 1, 2, 3, 4])
  const [monthDay, setMonthDay] = useState(parsed.monthDay ?? 1)
  const [customRrule, setCustomRrule] = useState(parsed.type === 'custom' ? task?.rrule ?? '' : '')

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Título *</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Limpar cozinha"
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

      <div>
        <label className="block text-sm font-medium mb-2">Recorrência *</label>
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
              onChange={() => setRecurrenceType('custom')}
            />
            <span>Personalizado (RRULE)</span>
          </label>

          {recurrenceType === 'custom' && (
            <div className="ml-6">
              <Input
                value={customRrule}
                onChange={(e) => setCustomRrule(e.target.value)}
                placeholder="FREQ=WEEKLY;INTERVAL=2;BYDAY=MO"
                className="font-mono text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {task && (
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
    </form>
  )
}
