# Hoje - Preview de Impressão

## Visão Geral

Tela de **preview** que mostra o que será impresso para um determinado dia. Esta é uma tela **somente leitura** - não há rastreamento de conclusão de tarefas.

> **IMPORTANTE**: Este sistema é um gerador de listas para impressão térmica.
> A página "Hoje" mostra o que seria impresso, não rastreia progresso.

## User Stories

### US-01: Ver preview do dia
**Como** usuário
**Quero** ver todas as tarefas que seriam impressas para uma data
**Para** verificar o que vai na lista antes de imprimir

### US-02: Navegar entre dias
**Como** usuário
**Quero** ver o preview de outros dias
**Para** verificar tarefas futuras ou passadas

### US-03: Imprimir direto
**Como** usuário
**Quero** imprimir a lista do dia a partir do preview
**Para** ter acesso rápido à impressão

## Wireframe

```
┌────────────────────────────────────────────────────────┐
│  ← Hoje, 16 de Janeiro →                    [Imprimir] │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌─ Maria (Faxineira) ─────────────── 5 tarefas ────┐ │
│  │                                                   │ │
│  │  • Limpar cozinha                                │ │
│  │  • Lavar banheiro                                │ │
│  │  • Passar roupa                                  │ │
│  │  • Organizar quartos                             │ │
│  │  • Limpar sala                                   │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                        │
│  ┌─ Joana (Cozinheira) ─────────────── 3 tarefas ───┐ │
│  │                                                   │ │
│  │  • Preparar almoço                               │ │
│  │  • Fazer lista de compras                        │ │
│  │  • Preparar jantar                               │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                        │
│  ┌─ Tarefas Especiais ──────────────────────────────┐ │
│  │                                                   │ │
│  │  📋 Limpar vidros (Vence: 20/01)                 │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Nota**: Não há checkboxes - esta é uma visualização read-only do que será impresso.

## Componentes

### Header do Dia

```tsx
interface DayHeaderProps {
  date: Date
  onPrevDay: () => void
  onNextDay: () => void
  onPrint: () => void
}
```

**Comportamento:**
- Exibe data formatada em português
- Setas para navegar entre dias
- Destaque visual para "Hoje"
- Botão de impressão rápida

### Card de Funcionário

```tsx
interface EmployeeTaskCardProps {
  employee: Employee | null // null = tarefas sem atribuição
  tasks: Task[]
}
```

**Comportamento:**
- Agrupa tarefas por funcionário
- Mostra contagem de tarefas
- Read-only (sem interação)

### Item de Tarefa

```tsx
interface TaskItemProps {
  task: Task
}
```

**Comportamento:**
- Exibe título da tarefa
- Ícone da categoria
- Read-only (sem checkbox)

## Estados

### Carregando
```
┌────────────────────────────────────────┐
│  Hoje, 16 de Janeiro                   │
├────────────────────────────────────────┤
│                                        │
│        ████████████████████            │
│        ████████████████████            │
│        ████████████████████            │
│                                        │
└────────────────────────────────────────┘
```

### Sem tarefas
```
┌────────────────────────────────────────┐
│  Hoje, 16 de Janeiro                   │
├────────────────────────────────────────┤
│                                        │
│           📋                           │
│                                        │
│     Nenhuma tarefa para este dia       │
│                                        │
│     [Criar tarefa]                     │
│                                        │
└────────────────────────────────────────┘
```

## Fluxo de Dados

```
┌─────────┐     ┌─────────────┐     ┌──────────────┐
│  Page   │────▶│  GET /api/  │────▶│   Database   │
│  Load   │     │ tasks/today │     │  (Tasks)     │
└─────────┘     └─────────────┘     └──────────────┘
                     │
                     ▼
              ┌─────────────┐
              │   Filter    │
              │  by rrule   │
              │  (runtime)  │
              └─────────────┘
                     │
                     ▼
              ┌─────────────┐
              │   Group by  │
              │  employee   │
              └─────────────┘
```

**Nota**: O rrule é armazenado como string e parseado em runtime para determinar se a tarefa aparece no dia.

## API Calls

### Carregar tarefas do dia

```typescript
// GET /api/tasks/for-date?date=2024-01-16

const response = await fetch(`/api/tasks/for-date?date=${date}`)
const { tasks, specialTasks } = await response.json()

// tasks já vem agrupado por funcionário
// specialTasks são tarefas especiais que aparecem no dia (com dueDate calculado)
```

**Nota**: Não há API de "marcar tarefa" - este sistema não rastreia conclusão.

## Lógica de Negócio

### Determinação de tarefas para uma data

1. Buscar todas as tarefas ativas
2. Para cada tarefa, verificar se a data corresponde ao rrule (parseado em runtime)
3. Filtrar por dias de trabalho do funcionário (se atribuído)
4. Agrupar por funcionário
5. Repetir para tarefas especiais (calculando dueDate = date + dueDays)

```typescript
import { RRule } from 'rrule'

function isTaskScheduledForDate(rruleString: string, date: Date, timezone: string): boolean {
  // Parse the rrule string with timezone
  const rule = RRule.fromString(rruleString)
  rule.options.tzid = timezone

  const occurrences = rule.between(
    startOfDay(date),
    endOfDay(date),
    true
  )
  return occurrences.length > 0
}
```

### Filtro por dia de trabalho

Tarefas de um funcionário só aparecem nos dias em que ele trabalha:

```typescript
function filterByWorkDay(tasks: Task[], date: Date): Task[] {
  const dayOfWeek = getDay(date) // 0-6

  return tasks.filter(task => {
    if (!task.employee) return true // Sem atribuição, sempre aparece
    return task.employee.workDays.includes(dayOfWeek)
  })
}
```

**Importante**: O timezone é obtido das configurações do sistema para garantir consistência.

## Interações

### Navegação de data

1. Usuário clica seta
2. Animação de transição
3. Atualiza URL (query param)
4. Carrega tarefas do novo dia
5. Scroll para topo

### Impressão rápida

1. Usuário clica "Imprimir"
2. Modal de confirmação (opcional)
3. Dispara impressão para o dia selecionado
4. Toast de sucesso/erro

## Acessibilidade

- Navegação por teclado (Tab, Enter)
- Leitores de tela com descrições adequadas
- Contraste adequado para leitura

## Performance

- Server Component para dados iniciais
- Cache de cálculos de rrule
- Prefetch de dias adjacentes

## Testes

### Unitários
- Cálculo de tarefas por rrule
- Agrupamento por funcionário
- Filtro por dia de trabalho

### Integração
- Navegação de data funciona
- Impressão dispara corretamente

### E2E
- Fluxo completo: login → ver preview → imprimir
