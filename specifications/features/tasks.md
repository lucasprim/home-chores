# Tarefas - Gerenciamento

## Visão Geral

CRUD de tarefas com suporte a recorrência, categorias e atribuição a funcionários.

> **IMPORTANTE**: A recorrência (rrule) determina **apenas** em quais dias a tarefa aparece na lista impressa.
> Este sistema não rastreia conclusão de tarefas - é apenas um gerador de listas para impressão térmica.

## User Stories

### US-01: Listar tarefas
**Como** usuário
**Quero** ver todas as tarefas cadastradas
**Para** gerenciar as atividades da casa

### US-02: Criar tarefa
**Como** usuário
**Quero** criar novas tarefas
**Para** definir atividades a serem realizadas

### US-03: Definir recorrência
**Como** usuário
**Quero** configurar quando a tarefa se repete
**Para** automatizar o agendamento

### US-04: Atribuir tarefa
**Como** usuário
**Quero** atribuir tarefas a funcionários
**Para** definir responsabilidades

### US-05: Editar tarefa
**Como** usuário
**Quero** editar tarefas existentes
**Para** ajustar conforme necessário

### US-06: Desativar tarefa
**Como** usuário
**Quero** desativar tarefas sem excluí-las
**Para** manter histórico

## Wireframes

### Lista de Tarefas

```
┌────────────────────────────────────────────────────────┐
│  Tarefas                               [+ Nova Tarefa] │
├────────────────────────────────────────────────────────┤
│  [Todas ▼] [Todas categorias ▼] [🔍 Buscar...        ] │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌────────────────────────────────────────────────────┐│
│  │ 🧹 Limpar cozinha                                  ││
│  │ Maria • Diariamente                          [...] ││
│  └────────────────────────────────────────────────────┘│
│                                                        │
│  ┌────────────────────────────────────────────────────┐│
│  │ 🧺 Lavar roupa                                     ││
│  │ Maria • Seg, Qua, Sex                        [...] ││
│  └────────────────────────────────────────────────────┘│
│                                                        │
│  ┌────────────────────────────────────────────────────┐│
│  │ 🍳 Preparar almoço                                 ││
│  │ Joana • Dias úteis                           [...] ││
│  └────────────────────────────────────────────────────┘│
│                                                        │
│  ┌──────────────────────────────────────── (inativa) ─┐│
│  │ 🌱 Podar jardim                                    ││
│  │ Sem atribuição • Mensal                      [...] ││
│  └────────────────────────────────────────────────────┘│
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Formulário de Tarefa

```
┌────────────────────────────────────────────────────────┐
│  ← Nova Tarefa                                         │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Título *                                              │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Limpar cozinha                                    │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Descrição                                             │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Limpar pia, fogão e bancadas. Passar pano no     │ │
│  │ chão e organizar armários.                        │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Categoria *                                           │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 🧹 Limpeza                                    ▼   │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Funcionário responsável                               │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Maria                                         ▼   │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Recorrência *                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │ ○ Diariamente                                     │ │
│  │ ○ Dias úteis (Seg-Sex)                           │ │
│  │ ● Dias específicos                               │ │
│  │   [✓]Seg [✓]Ter [ ]Qua [✓]Qui [ ]Sex [ ]Sab [ ]Dom│ │
│  │ ○ Mensal                                          │ │
│  │   Dia do mês: [15]                               │ │
│  │ ○ Personalizado                                   │ │
│  │   [FREQ=WEEKLY;INTERVAL=2;BYDAY=MO            ]  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  [ ] Tarefa ativa                                      │
│                                                        │
│                        [Cancelar]  [Salvar]            │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## Componentes

### Lista de Tarefas

```tsx
interface TaskListProps {
  tasks: Task[]
  onEdit: (task: Task) => void
  onToggleActive: (taskId: string, active: boolean) => void
}
```

### Card de Tarefa

```tsx
interface TaskCardProps {
  task: Task
  onEdit: () => void
  onToggleActive: () => void
}
```

**Informações exibidas:**
- Ícone da categoria
- Título
- Nome do funcionário (ou "Sem atribuição")
- Descrição da recorrência em texto legível
- Indicador de status (ativa/inativa)
- Menu de ações

### Formulário de Tarefa

```tsx
interface TaskFormProps {
  task?: Task // undefined = criar nova
  employees: Employee[]
  onSubmit: (data: TaskFormData) => void
  onCancel: () => void
}

interface TaskFormData {
  title: string
  description?: string
  category: Category
  employeeId?: string
  rrule: string
  active: boolean
}
```

### Seletor de Recorrência

```tsx
interface RecurrencePickerProps {
  value: string // rrule
  onChange: (rrule: string) => void
}
```

**Presets:**
- Diariamente (`FREQ=DAILY`)
- Dias úteis (`FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`)
- Dias específicos (checkbox para cada dia)
- Mensal (seletor de dia)
- Personalizado (input de rrule)

## Categorias

| Categoria | Ícone | Cor |
|-----------|-------|-----|
| LIMPEZA | 🧹 | blue |
| COZINHA | 🍳 | orange |
| LAVANDERIA | 🧺 | purple |
| ORGANIZACAO | 📦 | gray |
| COMPRAS | 🛒 | green |
| MANUTENCAO | 🔧 | yellow |
| JARDIM | 🌱 | emerald |
| CRIANCAS | 👶 | pink |
| PETS | 🐕 | amber |
| OUTRO | 📋 | slate |

## Validação

### Título
- Obrigatório
- Mínimo: 3 caracteres
- Máximo: 100 caracteres

### Descrição
- Opcional
- Máximo: 500 caracteres

### Categoria
- Obrigatória
- Deve ser valor válido do enum

### Recorrência
- Obrigatória
- Deve ser rrule válido
- Validar com biblioteca rrule

### Funcionário
- Opcional
- Se informado, deve existir e estar ativo

## Fluxo de Criação

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Listar    │────▶│  Formulário │────▶│   Validar   │
│   Tarefas   │     │  de Tarefa  │     │   Dados     │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                          ┌────────────────────┘
                          ▼
                    ┌─────────────┐     ┌─────────────┐
                    │   Salvar    │────▶│  Atualizar  │
                    │   no DB     │     │    Lista    │
                    └─────────────┘     └─────────────┘
```

## Conversão de RRULE para Texto

```typescript
const rruleToText: Record<string, string> = {
  'FREQ=DAILY': 'Diariamente',
  'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR': 'Dias úteis',
  'FREQ=WEEKLY;BYDAY=MO': 'Todas as segundas',
  'FREQ=WEEKLY;BYDAY=TU': 'Todas as terças',
  'FREQ=WEEKLY;BYDAY=WE': 'Todas as quartas',
  'FREQ=WEEKLY;BYDAY=TH': 'Todas as quintas',
  'FREQ=WEEKLY;BYDAY=FR': 'Todas as sextas',
  'FREQ=WEEKLY;BYDAY=SA': 'Todos os sábados',
  'FREQ=WEEKLY;BYDAY=SU': 'Todos os domingos',
  'FREQ=MONTHLY;BYMONTHDAY=1': 'Todo dia 1 do mês',
  'FREQ=MONTHLY;BYMONTHDAY=15': 'Todo dia 15 do mês',
}

function rruleToReadable(rrule: string): string {
  // Verifica presets conhecidos
  if (rruleToText[rrule]) {
    return rruleToText[rrule]
  }

  // Parse customizado
  const rule = RRule.fromString(rrule)

  // Dias específicos da semana
  if (rrule.includes('FREQ=WEEKLY') && rrule.includes('BYDAY=')) {
    const days = rule.options.byweekday?.map(d => dayNames[d]) || []
    return days.join(', ')
  }

  // Mensal
  if (rrule.includes('FREQ=MONTHLY') && rrule.includes('BYMONTHDAY=')) {
    const day = rule.options.bymonthday?.[0]
    return `Todo dia ${day} do mês`
  }

  // Fallback
  return rule.toText() // Usa texto em inglês da lib
}
```

## API Calls

### Listar tarefas

```typescript
// GET /api/tasks?active=true

const { data: tasks } = await fetch('/api/tasks?active=true').then(r => r.json())
```

### Criar tarefa

```typescript
// POST /api/tasks

const createTask = async (data: TaskFormData) => {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message)
  }

  return response.json()
}
```

### Atualizar tarefa

```typescript
// PUT /api/tasks/:id

const updateTask = async (id: string, data: Partial<TaskFormData>) => {
  const response = await fetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

  return response.json()
}
```

### Desativar tarefa

```typescript
// DELETE /api/tasks/:id (soft delete)

const deactivateTask = async (id: string) => {
  await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
}
```

## Estados do Formulário

### Criando
- Campos vazios
- Botão "Salvar"
- Título "Nova Tarefa"

### Editando
- Campos preenchidos
- Botão "Salvar alterações"
- Título "Editar Tarefa"

### Salvando
- Campos desabilitados
- Spinner no botão
- Sem navegação

### Erro
- Toast com mensagem
- Campos mantidos
- Focus no campo com erro

## Filtros da Lista

### Por funcionário
```typescript
const filteredTasks = tasks.filter(task =>
  !employeeFilter || task.employeeId === employeeFilter
)
```

### Por categoria
```typescript
const filteredTasks = tasks.filter(task =>
  !categoryFilter || task.category === categoryFilter
)
```

### Por busca
```typescript
const filteredTasks = tasks.filter(task =>
  !search || task.title.toLowerCase().includes(search.toLowerCase())
)
```

### Por status
```typescript
const filteredTasks = tasks.filter(task =>
  showInactive || task.active
)
```

## Acessibilidade

- Labels em todos os inputs
- Mensagens de erro associadas
- Navegação por teclado
- Focus trap no modal
- Anúncios de ARIA para ações

## Testes

### Unitários
- Validação de formulário
- Conversão de rrule para texto
- Filtros da lista

### Integração
- CRUD completo
- Validação no backend
- Feedback de erros

### E2E
- Criar tarefa com todos os campos
- Editar tarefa existente
- Desativar e reativar tarefa
- Filtrar lista
