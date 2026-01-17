'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button, Card, CardHeader, CardTitle, CardContent, Input } from '@/components/ui'
import { Role } from '@prisma/client'

interface Employee {
  id: string
  name: string
  role: Role
}

interface PreviewGroup {
  employee: { name: string; role: string } | null
  tasks: { title: string; description: string | null }[]
}

interface DailyTasksPreview {
  type: 'DAILY_TASKS'
  houseName: string
  date: string
  groups: PreviewGroup[]
  totalTasks: number
}

interface WeeklyMenuPreview {
  type: 'WEEKLY_MENU'
  houseName: string
  period: string
  days: {
    date: string
    lunch: string | null
    dinner: string | null
  }[]
}

type PrintPreview = DailyTasksPreview | WeeklyMenuPreview

type PrintType = 'DAILY_TASKS' | 'WEEKLY_MENU'

function getDateString(date: Date): string {
  return date.toISOString().split('T')[0] ?? ''
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div className="text-center py-8 text-[var(--muted-foreground)]">Carregando...</div>}>
      <PrintPageContent />
    </Suspense>
  )
}

function PrintPageContent() {
  const searchParams = useSearchParams()
  const dateParam = searchParams.get('date')

  const [printType, setPrintType] = useState<PrintType>('DAILY_TASKS')
  const [date, setDate] = useState(dateParam || getDateString(new Date()))
  const [employeeId, setEmployeeId] = useState('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [preview, setPreview] = useState<PrintPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees')
      if (res.ok) {
        const data = await res.json()
        setEmployees(data.filter((e: Employee & { active: boolean }) => e.active))
      }
    } catch {
      // Ignore
    }
  }, [])

  const fetchPreview = useCallback(async () => {
    try {
      setLoadingPreview(true)
      setError(null)
      const params = new URLSearchParams({
        type: printType,
        date,
      })
      if (employeeId && printType === 'DAILY_TASKS') {
        params.set('employeeId', employeeId)
      }

      const res = await fetch(`/api/print/preview?${params}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao carregar preview')
      }
      const data = await res.json()
      setPreview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar preview')
      setPreview(null)
    } finally {
      setLoadingPreview(false)
    }
  }, [printType, date, employeeId])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  useEffect(() => {
    fetchPreview()
  }, [fetchPreview])

  const handlePrint = async () => {
    try {
      setPrinting(true)
      setError(null)
      setSuccess(null)

      const res = await fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: printType,
          date,
          employeeId: employeeId || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao imprimir')
      }

      setSuccess(data.message || 'Impresso com sucesso!')
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao imprimir')
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Imprimir</h1>
        <Link href="/print-jobs">
          <Button variant="secondary">Impressao Automatica</Button>
        </Link>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>O que imprimir?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="printType"
                checked={printType === 'DAILY_TASKS'}
                onChange={() => setPrintType('DAILY_TASKS')}
              />
              <span>Tarefas do dia</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="printType"
                checked={printType === 'WEEKLY_MENU'}
                onChange={() => setPrintType('WEEKLY_MENU')}
              />
              <span>Cardápio semanal</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Data</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {printType === 'DAILY_TASKS' && (
            <div>
              <label className="block text-sm font-medium mb-1">Funcionário</label>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPreview ? (
            <div className="text-center py-4 text-[var(--muted-foreground)]">Carregando...</div>
          ) : preview ? (
            <div className="bg-[var(--secondary)] rounded-lg p-4 font-mono text-sm overflow-auto max-h-96">
              <PreviewContent preview={preview} />
            </div>
          ) : (
            <div className="text-center py-4 text-[var(--muted-foreground)]">
              Nenhum conteúdo para imprimir
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handlePrint}
          disabled={printing || !preview || (preview.type === 'DAILY_TASKS' && preview.totalTasks === 0)}
        >
          {printing ? 'Imprimindo...' : 'Imprimir'}
        </Button>
      </div>
    </div>
  )
}

function PreviewContent({ preview }: { preview: PrintPreview }) {
  if (preview.type === 'DAILY_TASKS') {
    return (
      <div className="text-center">
        <div className="font-bold text-lg">{preview.houseName.toUpperCase()}</div>
        <div>════════════════════════════════</div>
        <div className="font-bold mt-2">TAREFAS - {preview.date}</div>
        <div className="mt-2"></div>

        {preview.groups.length === 0 ? (
          <div className="text-[var(--muted-foreground)] mt-4">Nenhuma tarefa para este dia</div>
        ) : (
          preview.groups.map((group, index) => (
            <div key={index} className="mt-4 text-left">
              <div>────────────────────────────────</div>
              <div className="font-bold">{group.employee?.name?.toUpperCase() ?? 'SEM ATRIBUIÇÃO'}</div>
              <div className="mt-1"></div>
              {group.tasks.map((task, i) => (
                <div key={i}>
                  <div>[ ] {task.title}</div>
                  {task.description && (
                    <div className="ml-4 text-[var(--muted-foreground)]">{task.description}</div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}

        {preview.totalTasks > 0 && (
          <>
            <div className="mt-4">────────────────────────────────</div>
            <div>{preview.totalTasks} tarefas - Bom trabalho!</div>
            <div>════════════════════════════════</div>
          </>
        )}
      </div>
    )
  }

  if (preview.type === 'WEEKLY_MENU') {
    return (
      <div className="text-center">
        <div className="font-bold text-lg">{preview.houseName.toUpperCase()}</div>
        <div>════════════════════════════════</div>
        <div className="font-bold mt-2">CARDÁPIO DA SEMANA</div>
        <div>{preview.period}</div>
        <div className="mt-2"></div>

        {preview.days.map((day, index) => (
          <div key={index} className="mt-3 text-left">
            <div>────────────────────────────────</div>
            <div className="font-bold uppercase">{day.date}</div>
            <div>Almoço: {day.lunch ?? '(não definido)'}</div>
            <div>Jantar: {day.dinner ?? '(não definido)'}</div>
          </div>
        ))}

        <div className="mt-4">════════════════════════════════</div>
      </div>
    )
  }

  return null
}
