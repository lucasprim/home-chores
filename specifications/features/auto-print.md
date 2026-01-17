# Impressão Automática - Jobs Agendados

## Visão Geral

Sistema de agendamento de impressões automáticas usando expressões cron, permitindo imprimir tarefas diárias automaticamente.

## User Stories

### US-01: Criar job de impressão
**Como** usuário
**Quero** criar jobs de impressão automática
**Para** não precisar imprimir manualmente todo dia

### US-02: Configurar horário
**Como** usuário
**Quero** definir o horário da impressão
**Para** que esteja pronto quando o funcionário chegar

### US-03: Configurar dias
**Como** usuário
**Quero** definir em quais dias o job executa
**Para** não imprimir em fins de semana

### US-04: Ver histórico
**Como** usuário
**Quero** ver o histórico de execuções
**Para** acompanhar se está funcionando

### US-05: Executar manualmente
**Como** usuário
**Quero** executar um job manualmente
**Para** testar ou reimprimir

## Wireframes

### Lista de Jobs

```
┌────────────────────────────────────────────────────────┐
│  Impressão Automática                        [+ Novo]  │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌────────────────────────────────────────────────────┐│
│  │ ●  Tarefas da Maria - Manhã                        ││
│  │    Todo dia às 07:00, Seg-Sex                      ││
│  │    Última execução: Hoje, 07:00 ✓                  ││
│  │                                  [▶ Executar] [...] ││
│  └────────────────────────────────────────────────────┘│
│                                                        │
│  ┌────────────────────────────────────────────────────┐│
│  │ ●  Tarefas da Joana - Manhã                        ││
│  │    Seg, Qua, Sex às 07:00                          ││
│  │    Última execução: Ontem, 07:00 ✓                 ││
│  │                                  [▶ Executar] [...] ││
│  └────────────────────────────────────────────────────┘│
│                                                        │
│  ┌────────────────────────────────────────────────────┐│
│  │ ○  Cardápio Semanal                    (desativado)││
│  │    Segunda às 08:00                                ││
│  │    Última execução: 08/01/2024 ✓                   ││
│  │                                  [▶ Executar] [...] ││
│  └────────────────────────────────────────────────────┘│
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Formulário de Job

```
┌────────────────────────────────────────────────────────┐
│  ← Novo Job de Impressão                               │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Nome *                                                │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Tarefas da Maria - Manhã                          │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  O que imprimir *                                      │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Tarefas do dia                                ▼   │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Funcionário                                           │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Maria                                         ▼   │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Horário *                                             │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 07:00                                             │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Dias de execução *                                    │
│  ┌──────────────────────────────────────────────────┐ │
│  │  [✓] Seg  [✓] Ter  [✓] Qua  [✓] Qui  [✓] Sex     │ │
│  │  [ ] Sáb  [ ] Dom                                 │ │
│  │                                                   │ │
│  │  [Dias úteis] [Todos] [Limpar]                   │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  [✓] Job ativo                                        │
│                                                        │
│                        [Cancelar]  [Salvar]            │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Detalhes do Job (com histórico)

```
┌────────────────────────────────────────────────────────┐
│  ← Tarefas da Maria - Manhã                  [Editar]  │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Status: ● Ativo                                       │
│  Próxima execução: Amanhã, 07:00                      │
│                                                        │
│  ┌─ Configuração ───────────────────────────────────┐ │
│  │  Tipo: Tarefas do dia                             │ │
│  │  Funcionário: Maria                               │ │
│  │  Horário: 07:00                                   │ │
│  │  Dias: Seg, Ter, Qua, Qui, Sex                   │ │
│  │  Cron: 0 7 * * 1-5                               │ │
│  └───────────────────────────────────────────────────┘ │
│                                                        │
│  ┌─ Histórico ──────────────────────────────────────┐ │
│  │                                                   │ │
│  │  16/01 07:00  ✓ Sucesso                          │ │
│  │  15/01 07:00  ✓ Sucesso                          │ │
│  │  14/01 07:00  ✓ Sucesso (4 tarefas)              │ │
│  │  13/01 07:00  ⊘ Pulado (sem tarefas)             │ │
│  │  12/01 07:00  ✗ Erro: Impressora offline         │ │
│  │                                                   │ │
│  │  [Carregar mais]                                  │ │
│  └───────────────────────────────────────────────────┘ │
│                                                        │
│  [Desativar]  [Excluir]              [▶ Executar agora]│
│                                                        │
└────────────────────────────────────────────────────────┘
```

## Componentes

### Lista de Jobs

```tsx
interface PrintJobListProps {
  jobs: PrintJob[]
  onEdit: (job: PrintJob) => void
  onToggle: (jobId: string, enabled: boolean) => void
  onRun: (jobId: string) => void
}
```

### Card de Job

```tsx
interface PrintJobCardProps {
  job: PrintJob & { lastLog?: PrintLog }
  onEdit: () => void
  onToggle: () => void
  onRun: () => void
}
```

### Formulário de Job

```tsx
interface PrintJobFormProps {
  job?: PrintJob
  employees: Employee[]
  onSubmit: (data: PrintJobFormData) => void
  onCancel: () => void
}

interface PrintJobFormData {
  name: string
  type: PrintType
  employeeId?: string
  time: string // HH:mm
  days: number[] // 0-6
  enabled: boolean
}
```

### Histórico

```tsx
interface PrintJobHistoryProps {
  logs: PrintLog[]
  hasMore: boolean
  onLoadMore: () => void
}
```

## Expressões Cron

### Geração automática

```typescript
function generateCron(time: string, days: number[]): string {
  const [hours, minutes] = time.split(':')

  // Converter dias para formato cron
  // 0=Dom, 1=Seg, ..., 6=Sáb
  const cronDays = days.length === 7 ? '*' : days.join(',')

  // Formato: minuto hora * * dias
  return `${minutes} ${hours} * * ${cronDays}`
}

// Exemplos:
// 07:00, [1,2,3,4,5] → "0 7 * * 1,2,3,4,5"
// 08:30, [0,1,2,3,4,5,6] → "30 8 * * *"
// 19:00, [1] → "0 19 * * 1"
```

### Descrição legível

```typescript
function cronToReadable(cron: string, days: number[]): string {
  const [minutes, hours] = cron.split(' ')
  const time = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`

  // Casos especiais
  if (days.length === 7) {
    return `Todo dia às ${time}`
  }

  if (days.length === 5 && !days.includes(0) && !days.includes(6)) {
    return `Seg-Sex às ${time}`
  }

  if (days.length === 2 && days.includes(0) && days.includes(6)) {
    return `Fins de semana às ${time}`
  }

  // Lista de dias
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const dayList = days.map(d => dayNames[d]).join(', ')
  return `${dayList} às ${time}`
}
```

## Scheduler (node-cron)

### Inicialização

```typescript
// lib/scheduler.ts
import cron from 'node-cron'
import { prisma } from './db'
import { executePrintJob } from './printer'

const activeJobs: Map<string, cron.ScheduledTask> = new Map()

export async function initScheduler() {
  // Carregar jobs ativos do banco
  const jobs = await prisma.printJob.findMany({
    where: { enabled: true }
  })

  // Agendar cada job
  for (const job of jobs) {
    scheduleJob(job)
  }

  console.log(`Scheduler iniciado com ${jobs.length} jobs`)
}

export function scheduleJob(job: PrintJob) {
  // Cancelar job existente se houver
  const existing = activeJobs.get(job.id)
  if (existing) {
    existing.stop()
  }

  // Criar novo agendamento
  const task = cron.schedule(job.cronExpression, async () => {
    await executePrintJob(job.id)
  }, {
    timezone: 'America/Sao_Paulo'
  })

  activeJobs.set(job.id, task)
}

export function unscheduleJob(jobId: string) {
  const task = activeJobs.get(jobId)
  if (task) {
    task.stop()
    activeJobs.delete(jobId)
  }
}
```

### Execução do Job

```typescript
// lib/printer.ts

export async function executePrintJob(jobId: string) {
  const job = await prisma.printJob.findUnique({
    where: { id: jobId },
    include: { employee: true }
  })

  if (!job || !job.enabled) return

  const today = new Date()

  try {
    // Verificar se o funcionário trabalha hoje
    if (job.employee) {
      const dayOfWeek = today.getDay()
      if (!job.employee.workDays.includes(dayOfWeek)) {
        await createPrintLog(jobId, 'SKIPPED', 'Funcionário não trabalha hoje')
        return
      }
    }

    // Buscar tarefas do dia
    const tasks = await getTasksForDate(today, job.employeeId)

    if (tasks.length === 0) {
      await createPrintLog(jobId, 'SKIPPED', 'Nenhuma tarefa para hoje')
      return
    }

    // Executar impressão
    await printDailyTasks(today, job.employeeId)

    // Registrar sucesso
    await createPrintLog(jobId, 'SUCCESS')

    // Atualizar lastRunAt
    await prisma.printJob.update({
      where: { id: jobId },
      data: { lastRunAt: new Date() }
    })

  } catch (error) {
    await createPrintLog(jobId, 'FAILED', error.message)
  }
}

async function createPrintLog(
  printJobId: string,
  status: PrintStatus,
  error?: string
) {
  await prisma.printLog.create({
    data: {
      printJobId,
      status,
      error
    }
  })
}
```

## Tipos de Job

### DAILY_TASKS
- Imprime tarefas do dia
- Pode filtrar por funcionário
- Verifica dia de trabalho do funcionário
- Pula se não houver tarefas

### WEEKLY_MENU
- Imprime cardápio da semana
- Executar no início da semana (ex: segunda)
- Mostra 7 dias a partir da data

## Validação

### Nome
- Obrigatório
- 3-100 caracteres

### Horário
- Obrigatório
- Formato HH:mm
- Valores válidos (00:00 a 23:59)

### Dias
- Obrigatório (pelo menos 1 dia)
- Valores entre 0 e 6

## API Calls

### Listar jobs

```typescript
// GET /api/print-jobs

const { data: jobs } = await fetch('/api/print-jobs').then(r => r.json())
```

### Criar job

```typescript
// POST /api/print-jobs

const createPrintJob = async (data: PrintJobFormData) => {
  // Gerar cron expression
  const cronExpression = generateCron(data.time, data.days)

  const response = await fetch('/api/print-jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      cronExpression
    })
  })

  return response.json()
}
```

### Atualizar job

```typescript
// PUT /api/print-jobs/:id

const updatePrintJob = async (id: string, data: Partial<PrintJobFormData>) => {
  const response = await fetch(`/api/print-jobs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

  return response.json()
}
```

### Executar job manualmente

```typescript
// POST /api/print-jobs/:id/run

const runPrintJob = async (id: string) => {
  const response = await fetch(`/api/print-jobs/${id}/run`, {
    method: 'POST'
  })

  return response.json()
}
```

### Histórico de execuções

```typescript
// GET /api/print-jobs/:id/logs?limit=10&offset=0

const getJobLogs = async (id: string, limit = 10, offset = 0) => {
  const response = await fetch(
    `/api/print-jobs/${id}/logs?limit=${limit}&offset=${offset}`
  )
  return response.json()
}
```

## Estados do Job

| Estado | Ícone | Descrição |
|--------|-------|-----------|
| Ativo | ● verde | Job está agendado e executará |
| Desativado | ○ cinza | Job existe mas não executa |
| Executando | ⟳ | Job em execução no momento |

## Status do Log

| Status | Ícone | Descrição |
|--------|-------|-----------|
| SUCCESS | ✓ verde | Impressão realizada |
| FAILED | ✗ vermelho | Erro na impressão |
| SKIPPED | ⊘ amarelo | Pulado (sem tarefas, dia inválido) |

## Próxima Execução

```typescript
import { parseExpression } from 'cron-parser'

function getNextExecution(cronExpression: string): Date {
  const interval = parseExpression(cronExpression, {
    tz: 'America/Sao_Paulo'
  })
  return interval.next().toDate()
}

function formatNextExecution(date: Date): string {
  const now = new Date()
  const diff = differenceInDays(date, now)

  if (diff === 0) return `Hoje, ${format(date, 'HH:mm')}`
  if (diff === 1) return `Amanhã, ${format(date, 'HH:mm')}`

  return format(date, "dd/MM, HH:mm")
}
```

## Sincronização

Quando um job é criado/atualizado/deletado via API:

1. Salvar no banco de dados
2. Chamar função para atualizar scheduler em memória
3. Retornar resposta ao cliente

```typescript
// Em route handler
export async function POST(request: Request) {
  const data = await request.json()

  // Salvar no banco
  const job = await prisma.printJob.create({ data })

  // Sincronizar com scheduler
  if (job.enabled) {
    scheduleJob(job)
  }

  return Response.json({ data: job })
}
```

## Testes

### Unitários
- Geração de cron expression
- Conversão para texto legível
- Cálculo de próxima execução

### Integração
- CRUD de jobs
- Sincronização com scheduler
- Registro de logs

### E2E
- Criar job e verificar agendamento
- Executar manualmente e verificar impressão
- Verificar histórico após execução
- Desativar e verificar que não executa
