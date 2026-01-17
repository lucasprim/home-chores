'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button, Card, CardContent, Badge, Modal, Input } from '@/components/ui'
import { PrintType, PrintStatus, Role } from '@prisma/client'

interface Employee {
  id: string
  name: string
  role: Role
}

interface PrintLog {
  id: string
  status: PrintStatus
  error: string | null
  createdAt: string
}

interface PrintJob {
  id: string
  name: string
  cronExpression: string
  type: PrintType
  employeeId: string | null
  enabled: boolean
  lastRunAt: string | null
  employee: { id: string; name: string } | null
  logs: PrintLog[]
}

const PRINT_TYPE_LABELS: Record<PrintType, string> = {
  DAILY_TASKS: 'Tarefas do dia',
  SINGLE_TASK: 'Tarefa individual',
  WEEKLY_MENU: 'Cardápio semanal',
}

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function cronToReadable(cron: string): string {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return cron

  const [minutes, hours, , , daysOfWeek] = parts
  const time = `${hours?.padStart(2, '0')}:${minutes?.padStart(2, '0')}`

  if (daysOfWeek === '*') {
    return `Todo dia às ${time}`
  }

  // Parse days
  const days: number[] = []
  const dayParts = daysOfWeek?.split(',') ?? []
  for (const part of dayParts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number)
      if (start !== undefined && end !== undefined) {
        for (let i = start; i <= end; i++) {
          days.push(i)
        }
      }
    } else {
      const num = Number(part)
      if (!isNaN(num)) days.push(num)
    }
  }

  if (days.length === 5 && !days.includes(0) && !days.includes(6)) {
    return `Seg-Sex às ${time}`
  }

  if (days.length === 2 && days.includes(0) && days.includes(6)) {
    return `Fins de semana às ${time}`
  }

  const dayNames = days.map((d) => DAY_LABELS[d] ?? d).join(', ')
  return `${dayNames} às ${time}`
}

function formatLastRun(dateStr: string | null): string {
  if (!dateStr) return 'Nunca executado'

  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  }
  if (days === 1) {
    return `Ontem, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function PrintJobsPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<PrintJob | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [runningJobId, setRunningJobId] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<{ jobId: string; message: string; success: boolean } | null>(null)

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/print-jobs')
      if (!res.ok) throw new Error('Erro ao carregar jobs')
      const data = await res.json()
      setJobs(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const handleAdd = () => {
    setEditingJob(null)
    setIsModalOpen(true)
  }

  const handleEdit = (job: PrintJob) => {
    setEditingJob(job)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/print-jobs/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir job')
      await fetchJobs()
      setDeleteConfirmId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir')
    }
  }

  const handleToggle = async (job: PrintJob) => {
    try {
      const res = await fetch(`/api/print-jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !job.enabled }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar job')
      await fetchJobs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar')
    }
  }

  const handleRun = async (jobId: string) => {
    try {
      setRunningJobId(jobId)
      setRunResult(null)
      const res = await fetch(`/api/print-jobs/${jobId}/run`, { method: 'POST' })
      const data = await res.json()

      setRunResult({
        jobId,
        message: data.message || data.error || 'Executado',
        success: data.success ?? res.ok,
      })

      await fetchJobs()
    } catch (err) {
      setRunResult({
        jobId,
        message: err instanceof Error ? err.message : 'Erro ao executar',
        success: false,
      })
    } finally {
      setRunningJobId(null)
      setTimeout(() => setRunResult(null), 5000)
    }
  }

  const handleFormSubmit = async () => {
    await fetchJobs()
    setIsModalOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Impressao Automatica</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Configure jobs para imprimir automaticamente
          </p>
        </div>
        <Button onClick={handleAdd}>+ Novo</Button>
      </div>

      <Link
        href="/print"
        className="text-sm text-[var(--primary)] hover:underline flex items-center gap-1"
      >
        ← Voltar para Imprimir
      </Link>

      {error && (
        <div className="p-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
          {error}
        </div>
      )}

      {runResult && (
        <div
          className={`p-3 rounded-lg ${
            runResult.success
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
          }`}
        >
          {runResult.message}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-[var(--muted-foreground)]">Carregando...</div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-[var(--muted-foreground)]">Nenhum job configurado ainda.</p>
            <Button onClick={handleAdd} className="mt-4">
              Criar primeiro job
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const lastLog = job.logs[0]
            const statusIcon = job.enabled ? '●' : '○'
            const statusColor = job.enabled ? 'text-green-500' : 'text-gray-400'

            return (
              <Card key={job.id} className={!job.enabled ? 'opacity-60' : ''}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`${statusColor} text-lg`}>{statusIcon}</span>
                        <span className="font-medium truncate">{job.name}</span>
                      </div>
                      <div className="text-sm text-[var(--muted-foreground)] mt-1">
                        {cronToReadable(job.cronExpression)}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline">{PRINT_TYPE_LABELS[job.type]}</Badge>
                        {job.employee && <Badge>{job.employee.name}</Badge>}
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)] mt-2 flex items-center gap-2">
                        <span>Ultima execucao: {formatLastRun(job.lastRunAt)}</span>
                        {lastLog && (
                          <Badge
                            variant={
                              lastLog.status === 'SUCCESS'
                                ? 'default'
                                : lastLog.status === 'SKIPPED'
                                  ? 'warning'
                                  : 'destructive'
                            }
                          >
                            {lastLog.status === 'SUCCESS'
                              ? '✓'
                              : lastLog.status === 'SKIPPED'
                                ? '⊘'
                                : '✗'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRun(job.id)}
                        disabled={runningJobId === job.id}
                      >
                        {runningJobId === job.id ? '...' : '▶'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(job)}>
                        ✏️
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggle(job)}>
                        {job.enabled ? '⏸' : '▶️'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(job.id)}>
                        🗑️
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingJob ? 'Editar Job' : 'Novo Job'}
      >
        <PrintJobForm
          job={editingJob}
          onSuccess={handleFormSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      <Modal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Confirmar Exclusao"
      >
        <p className="mb-4">Tem certeza que deseja excluir este job?</p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
          >
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  )
}

interface PrintJobFormProps {
  job: PrintJob | null
  onSuccess: () => void
  onCancel: () => void
}

function generateCron(time: string, days: number[]): string {
  const [hours, minutes] = time.split(':')
  const cronDays = days.length === 7 ? '*' : days.sort((a, b) => a - b).join(',')
  return `${minutes} ${hours} * * ${cronDays}`
}

function parseCron(cron: string): { time: string; days: number[] } {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return { time: '07:00', days: [1, 2, 3, 4, 5] }

  const [minutes, hours, , , daysOfWeek] = parts
  const time = `${hours?.padStart(2, '0')}:${minutes?.padStart(2, '0')}`

  if (daysOfWeek === '*') {
    return { time, days: [0, 1, 2, 3, 4, 5, 6] }
  }

  const days: number[] = []
  const dayParts = daysOfWeek?.split(',') ?? []
  for (const part of dayParts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number)
      if (start !== undefined && end !== undefined) {
        for (let i = start; i <= end; i++) {
          days.push(i)
        }
      }
    } else {
      const num = Number(part)
      if (!isNaN(num)) days.push(num)
    }
  }

  return { time, days }
}

function PrintJobForm({ job, onSuccess, onCancel }: PrintJobFormProps) {
  const parsed = job ? parseCron(job.cronExpression) : { time: '07:00', days: [1, 2, 3, 4, 5] }

  const [name, setName] = useState(job?.name ?? '')
  const [type, setType] = useState<PrintType>(job?.type ?? 'DAILY_TASKS')
  const [employeeId, setEmployeeId] = useState(job?.employeeId ?? '')
  const [time, setTime] = useState(parsed.time)
  const [days, setDays] = useState<number[]>(parsed.days)
  const [enabled, setEnabled] = useState(job?.enabled ?? true)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/employees')
      .then((res) => res.json())
      .then((data) => setEmployees(data.filter((e: Employee & { active: boolean }) => e.active)))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (days.length === 0) {
        throw new Error('Selecione pelo menos um dia')
      }

      const cronExpression = generateCron(time, days)
      const url = job ? `/api/print-jobs/${job.id}` : '/api/print-jobs'
      const method = job ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          cronExpression,
          employeeId: employeeId || null,
          enabled,
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

  const toggleDay = (day: number) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    )
  }

  const setPresetDays = (preset: 'weekdays' | 'all' | 'clear') => {
    if (preset === 'weekdays') setDays([1, 2, 3, 4, 5])
    else if (preset === 'all') setDays([0, 1, 2, 3, 4, 5, 6])
    else setDays([])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Nome *</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Tarefas da Maria - Manha"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">O que imprimir *</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as PrintType)}
          className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)]"
        >
          <option value="DAILY_TASKS">Tarefas do dia</option>
          <option value="WEEKLY_MENU">Cardapio semanal</option>
        </select>
      </div>

      {type === 'DAILY_TASKS' && (
        <div>
          <label className="block text-sm font-medium mb-1">Funcionario</label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)]"
          >
            <option value="">Todos</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Horario *</label>
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Dias de execucao *</label>
        <div className="flex gap-1 flex-wrap mb-2">
          {DAY_LABELS.map((label, index) => (
            <button
              key={index}
              type="button"
              onClick={() => toggleDay(index)}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${
                  days.includes(index)
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                    : 'bg-[var(--secondary)] text-[var(--secondary-foreground)]'
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setPresetDays('weekdays')}>
            Dias uteis
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setPresetDays('all')}>
            Todos
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setPresetDays('clear')}>
            Limpar
          </Button>
        </div>
      </div>

      {job && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="enabled" className="text-sm">
            Job ativo
          </label>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : job ? 'Salvar' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
