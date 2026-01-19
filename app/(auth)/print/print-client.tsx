'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button, Card, CardHeader, CardTitle, CardContent, Input } from '@/components/ui'
import { Role } from '@prisma/client'

interface Employee {
  id: string
  name: string
  role: Role
}

type PreviewPage =
  | {
      type: 'UNASSIGNED_TASKS'
      title: string
      tasks: { title: string; description: string | null }[]
    }
  | {
      type: 'EMPLOYEE_TASKS'
      title: string
      employee: { name: string; role: string }
      tasks: { title: string; description: string | null }[]
    }
  | {
      type: 'MENU'
      title: string
      lunch?: string
      dinner?: string
    }
  | {
      type: 'SPECIAL_TASK'
      title: string
      task: {
        title: string
        description: string | null
        dueDate: string
        daysRemaining: number
        category: string
        employee: { name: string; role: string } | null
      }
    }

interface DailyTasksPreview {
  type: 'DAILY_TASKS'
  houseName: string
  date: string
  pages: PreviewPage[]
  totalTasks: number
  totalSpecialTasks: number
  hasMenu: boolean
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

interface PrintPageClientProps {
  initialDate: string
  employees: Employee[]
}

export function PrintPageClient({ initialDate, employees }: PrintPageClientProps) {
  const [printType, setPrintType] = useState<PrintType>('DAILY_TASKS')
  const [date, setDate] = useState(initialDate)
  const [employeeId, setEmployeeId] = useState('')
  const [includeSpecialTasks, setIncludeSpecialTasks] = useState(true)
  const [preview, setPreview] = useState<PrintPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [printing, setPrinting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
      if (printType === 'DAILY_TASKS') {
        params.set('includeSpecialTasks', String(includeSpecialTasks))
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
  }, [printType, date, employeeId, includeSpecialTasks])

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
          includeSpecialTasks,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao imprimir')
      }

      setSuccess(data.message || 'Impresso com sucesso!')
      setTimeout(() => setSuccess(null), 5000)
      fetchPreview()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao imprimir')
    } finally {
      setPrinting(false)
    }
  }

  const canPrint =
    preview &&
    (preview.type === 'WEEKLY_MENU' ||
      (preview.type === 'DAILY_TASKS' && preview.pages.length > 0))

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
            <>
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

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeSpecialTasks}
                  onChange={(e) => setIncludeSpecialTasks(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Incluir tarefas especiais</span>
              </label>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Preview</span>
            {preview?.type === 'DAILY_TASKS' && preview.pages.length > 0 && (
              <span className="text-sm font-normal text-[var(--muted-foreground)]">
                {preview.pages.length} página{preview.pages.length !== 1 ? 's' : ''}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPreview ? (
            <div className="text-center py-4 text-[var(--muted-foreground)]">Carregando...</div>
          ) : preview ? (
            <div className="bg-[var(--secondary)] rounded-lg p-4 font-mono text-sm overflow-auto max-h-[600px]">
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
        <Button onClick={handlePrint} disabled={printing || !canPrint}>
          {printing ? 'Imprimindo...' : 'Imprimir'}
        </Button>
      </div>
    </div>
  )
}

function PreviewContent({ preview }: { preview: PrintPreview }) {
  if (preview.type === 'DAILY_TASKS') {
    if (preview.pages.length === 0) {
      return (
        <div className="text-center text-[var(--muted-foreground)]">
          Nenhuma tarefa, cardápio ou tarefa especial para este dia
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {preview.pages.map((page, index) => (
          <div key={index}>
            {index > 0 && (
              <div className="flex items-center gap-2 my-4 text-[var(--muted-foreground)]">
                <div className="flex-1 border-t border-dashed border-[var(--border)]" />
                <span className="text-xs flex items-center gap-1">✂️ corte parcial</span>
                <div className="flex-1 border-t border-dashed border-[var(--border)]" />
              </div>
            )}
            <PagePreview page={page} houseName={preview.houseName} date={preview.date} />
          </div>
        ))}
      </div>
    )
  }

  if (preview.type === 'WEEKLY_MENU') {
    return (
      <div className="text-center">
        <div className="font-bold text-lg">{preview.houseName.toUpperCase()}</div>
        <div>================================</div>
        <div className="font-bold mt-2">CARDÁPIO DA SEMANA</div>
        <div>{preview.period}</div>
        <div className="mt-2"></div>

        {preview.days.map((day, index) => (
          <div key={index} className="mt-3">
            <div>--------------------------------</div>
            <div className="font-bold uppercase">{day.date}</div>
            <div>Almoço: {day.lunch ?? '(não definido)'}</div>
            <div>Jantar: {day.dinner ?? '(não definido)'}</div>
          </div>
        ))}

        <div className="mt-4">================================</div>
      </div>
    )
  }

  return null
}

function PagePreview({
  page,
  houseName,
  date,
}: {
  page: PreviewPage
  houseName: string
  date: string
}) {
  if (page.type === 'UNASSIGNED_TASKS' || page.type === 'EMPLOYEE_TASKS') {
    const title = page.type === 'UNASSIGNED_TASKS' ? 'TAREFAS GERAIS' : page.title.toUpperCase()
    return (
      <div className="text-center">
        <div className="font-bold text-lg">{houseName.toUpperCase()}</div>
        <div>================================</div>
        <div className="font-bold mt-2">{title}</div>
        <div className="text-xs">{date}</div>
        <div className="mt-2">
          {page.tasks.map((task, i) => (
            <div key={i}>
              <div>[ ] {task.title}</div>
              {task.description && (
                <div className="text-[var(--muted-foreground)]">{task.description}</div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-2">
          <div>
            {page.tasks.length} tarefa{page.tasks.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div>================================</div>
      </div>
    )
  }

  if (page.type === 'MENU') {
    return (
      <div className="text-center">
        <div className="font-bold text-lg">{houseName.toUpperCase()}</div>
        <div>================================</div>
        <div className="font-bold mt-2">CARDÁPIO DO DIA</div>
        <div className="text-xs">{date}</div>
        <div className="mt-2">
          {page.lunch && (
            <div>
              <span className="font-bold">Almoço:</span> {page.lunch}
            </div>
          )}
          {page.dinner && (
            <div>
              <span className="font-bold">Jantar:</span> {page.dinner}
            </div>
          )}
        </div>
        <div className="mt-2">================================</div>
      </div>
    )
  }

  if (page.type === 'SPECIAL_TASK') {
    const { task } = page
    const daysLabel =
      task.daysRemaining < 0
        ? `ATRASADA ${Math.abs(task.daysRemaining)} dia${Math.abs(task.daysRemaining) !== 1 ? 's' : ''}!`
        : task.daysRemaining === 0
          ? 'VENCE HOJE!'
          : task.daysRemaining === 1
            ? 'VENCE AMANHÃ!'
            : `${task.daysRemaining} dias restantes`

    return (
      <div className="text-center">
        <div className="text-yellow-600 dark:text-yellow-400">****************************</div>
        <div className="font-bold text-lg mt-1">TAREFA ESPECIAL</div>
        <div className="text-yellow-600 dark:text-yellow-400">****************************</div>
        <div className="font-bold mt-2">{houseName.toUpperCase()}</div>
        <div className="mt-2 font-bold text-lg">[ ] {task.title.toUpperCase()}</div>
        {task.description && (
          <div className="mt-2 text-[var(--muted-foreground)]">{task.description}</div>
        )}
        <div className="mt-3 font-bold">
          <div>
            RESPONSÁVEL: {task.employee ? task.employee.name.toUpperCase() : 'NÃO ATRIBUÍDO'}
          </div>
        </div>
        <div className="mt-2 font-bold">
          <div>VENCE: {task.dueDate}</div>
          <div className={task.daysRemaining <= 2 ? 'text-orange-600 dark:text-orange-400' : ''}>
            ({daysLabel})
          </div>
        </div>
        <div className="mt-2 text-yellow-600 dark:text-yellow-400">****************************</div>
      </div>
    )
  }

  return null
}
