# Hoje - Dashboard de Tarefas

## Visão Geral

Tela principal que exibe as tarefas do dia organizadas por funcionário. É a página inicial após login.

## User Stories

### US-01: Ver tarefas do dia
**Como** usuário
**Quero** ver todas as tarefas programadas para hoje
**Para** acompanhar o que precisa ser feito

### US-02: Marcar tarefa como concluída
**Como** usuário
**Quero** marcar tarefas como concluídas
**Para** acompanhar o progresso do dia

### US-03: Filtrar por funcionário
**Como** usuário
**Quero** ver tarefas de um funcionário específico
**Para** verificar a carga de trabalho individual

### US-04: Navegar entre dias
**Como** usuário
**Quero** ver tarefas de outros dias
**Para** planejar ou revisar tarefas passadas

## Wireframe

```
┌────────────────────────────────────────────────────────┐
│  ← Hoje, 16 de Janeiro →                    [Imprimir] │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌─ Maria (Faxineira) ──────────────── 2/5 ─────────┐ │
│  │                                                   │ │
│  │  [✓] Limpar cozinha                              │ │
│  │  [✓] Lavar banheiro                              │ │
│  │  [ ] Passar roupa                                │ │
│  │  [ ] Organizar quartos                           │ │
│  │  [ ] Limpar sala                                 │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                        │
│  ┌─ Joana (Cozinheira) ─────────────── 1/3 ─────────┐ │
│  │                                                   │ │
│  │  [✓] Preparar almoço                             │ │
│  │  [ ] Fazer lista de compras                      │ │
│  │  [ ] Preparar jantar                             │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                        │
│  ┌─ Sem funcionário atribuído ──────── 0/1 ─────────┐ │
│  │                                                   │ │
│  │  [ ] Regar plantas                               │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                        │
└────────────────────────────────────────────────────────┘
```

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
  tasks: TaskOccurrence[]
  onToggleTask: (taskId: string, completed: boolean) => void
}
```

**Comportamento:**
- Agrupa tarefas por funcionário
- Mostra progresso (X/Y tarefas)
- Permite expandir/colapsar
- Checkbox para marcar conclusão

### Item de Tarefa

```tsx
interface TaskItemProps {
  occurrence: TaskOccurrence
  onToggle: (completed: boolean) => void
  onAddNote: (note: string) => void
}
```

**Comportamento:**
- Checkbox para marcar conclusão
- Ícone da categoria
- Animação ao completar
- Long press para adicionar nota

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
│     Nenhuma tarefa para hoje           │
│                                        │
│     [Criar tarefa]                     │
│                                        │
└────────────────────────────────────────┘
```

### Tudo concluído
```
┌────────────────────────────────────────┐
│  Hoje, 16 de Janeiro           ✓ 100%  │
├────────────────────────────────────────┤
│                                        │
│           ✅                           │
│                                        │
│     Todas as tarefas concluídas!       │
│                                        │
└────────────────────────────────────────┘
```

## Fluxo de Dados

```
┌─────────┐     ┌─────────────┐     ┌──────────────┐
│  Page   │────▶│  GET /api/  │────▶│   Database   │
│  Load   │     │ occurrences │     │              │
└─────────┘     └─────────────┘     └──────────────┘
                     │
                     ▼
              ┌─────────────┐
              │  Calculate  │
              │ occurrences │
              │ from rrule  │
              └─────────────┘
                     │
                     ▼
              ┌─────────────┐
              │   Group by  │
              │  employee   │
              └─────────────┘
```

## API Calls

### Carregar tarefas do dia

```typescript
// GET /api/occurrences?date=2024-01-16

const response = await fetch(`/api/occurrences?date=${date}`)
const { data } = await response.json()

// Agrupar por funcionário
const grouped = groupBy(data, 'task.employeeId')
```

### Marcar tarefa

```typescript
// PUT /api/occurrences/:id
// ou POST /api/occurrences (se não existe ainda)

const toggleTask = async (occurrenceId: string | null, taskId: string, date: string, completed: boolean) => {
  if (occurrenceId) {
    await fetch(`/api/occurrences/${occurrenceId}`, {
      method: 'PUT',
      body: JSON.stringify({ completed })
    })
  } else {
    await fetch('/api/occurrences', {
      method: 'POST',
      body: JSON.stringify({ taskId, date, completed })
    })
  }
}
```

## Lógica de Negócio

### Cálculo de ocorrências

1. Buscar todas as tarefas ativas
2. Para cada tarefa, verificar se a data corresponde ao rrule
3. Buscar ocorrências existentes no banco
4. Mesclar tarefas calculadas com ocorrências existentes
5. Agrupar por funcionário

```typescript
import { RRule } from 'rrule'

function getTasksForDate(tasks: Task[], date: Date): TaskWithOccurrence[] {
  return tasks.filter(task => {
    const rule = RRule.fromString(task.rrule)
    const occurrences = rule.between(
      startOfDay(date),
      endOfDay(date),
      true
    )
    return occurrences.length > 0
  })
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

## Interações

### Toggle de tarefa

1. Usuário clica no checkbox
2. UI atualiza otimisticamente
3. Animação de conclusão
4. Request para API
5. Se erro, reverte UI e mostra toast

### Navegação de data

1. Usuário clica seta
2. Animação de transição
3. Atualiza URL (query param)
4. Carrega tarefas do novo dia
5. Scroll para topo

### Impressão rápida

1. Usuário clica "Imprimir"
2. Modal de confirmação
3. Se confirma, dispara impressão
4. Toast de sucesso/erro

## Acessibilidade

- Checkboxes com labels descritivos
- Navegação por teclado (Tab, Enter, Space)
- Anúncios de leitores de tela ao completar
- Contraste adequado para status

## Performance

- Server Component para dados iniciais
- Otimistic updates para toggle
- Debounce em atualizações
- Cache de cálculos de rrule
- Prefetch de dias adjacentes

## Testes

### Unitários
- Cálculo de ocorrências de rrule
- Agrupamento por funcionário
- Filtro por dia de trabalho

### Integração
- Toggle de tarefa persiste
- Navegação de data funciona
- Impressão dispara corretamente

### E2E
- Fluxo completo: login → ver tarefas → marcar → imprimir
