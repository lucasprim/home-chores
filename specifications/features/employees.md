# Funcionários - Gerenciamento

## Visão Geral

CRUD de funcionários com definição de função, dias de trabalho e status.

## User Stories

### US-01: Listar funcionários
**Como** usuário
**Quero** ver todos os funcionários cadastrados
**Para** gerenciar a equipe da casa

### US-02: Criar funcionário
**Como** usuário
**Quero** cadastrar novos funcionários
**Para** poder atribuir tarefas a eles

### US-03: Definir dias de trabalho
**Como** usuário
**Quero** configurar os dias em que cada funcionário trabalha
**Para** que as tarefas sejam agendadas corretamente

### US-04: Editar funcionário
**Como** usuário
**Quero** atualizar informações do funcionário
**Para** manter os dados atualizados

### US-05: Desativar funcionário
**Como** usuário
**Quero** desativar funcionários que não trabalham mais
**Para** manter o histórico sem poluir a lista

## Wireframes

### Lista de Funcionários

```
┌────────────────────────────────────────────────────────┐
│  Funcionários                       [+ Novo Funcionário]│
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌────────────────────────────────────────────────────┐│
│  │  👤  Maria                                         ││
│  │      Faxineira                                     ││
│  │      Seg, Ter, Qua, Qui, Sex                       ││
│  │      5 tarefas atribuídas                    [...] ││
│  └────────────────────────────────────────────────────┘│
│                                                        │
│  ┌────────────────────────────────────────────────────┐│
│  │  👤  Joana                                         ││
│  │      Cozinheira                                    ││
│  │      Seg, Qua, Sex                                 ││
│  │      3 tarefas atribuídas                    [...] ││
│  └────────────────────────────────────────────────────┘│
│                                                        │
│  ┌──────────────────────────────────────── (inativo) ─┐│
│  │  👤  Carlos                                        ││
│  │      Jardineiro                                    ││
│  │      Desativado em 15/12/2023                [...] ││
│  └────────────────────────────────────────────────────┘│
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Formulário de Funcionário

```
┌────────────────────────────────────────────────────────┐
│  ← Novo Funcionário                                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Nome *                                                │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Maria da Silva                                    │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Função *                                              │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Faxineira                                     ▼   │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Dias de trabalho *                                    │
│  ┌──────────────────────────────────────────────────┐ │
│  │  [✓] Seg  [✓] Ter  [✓] Qua  [✓] Qui  [✓] Sex     │ │
│  │  [ ] Sáb  [ ] Dom                                 │ │
│  │                                                   │ │
│  │  [Dias úteis] [Todos] [Limpar]                   │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  [✓] Funcionário ativo                                │
│                                                        │
│                        [Cancelar]  [Salvar]            │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Detalhes do Funcionário

```
┌────────────────────────────────────────────────────────┐
│  ← Maria                                      [Editar] │
├────────────────────────────────────────────────────────┤
│                                                        │
│        ┌────────┐                                      │
│        │  👤    │  Maria da Silva                     │
│        │        │  Faxineira                          │
│        └────────┘  Desde 15/01/2023                   │
│                                                        │
├────────────────────────────────────────────────────────┤
│  Dias de trabalho                                      │
│  ┌────┬────┬────┬────┬────┬────┬────┐                │
│  │ D  │ S  │ T  │ Q  │ Q  │ S  │ S  │                │
│  │    │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │    │                │
│  └────┴────┴────┴────┴────┴────┴────┘                │
├────────────────────────────────────────────────────────┤
│  Tarefas atribuídas                                    │
│                                                        │
│  🧹 Limpar cozinha                     Diariamente    │
│  🧹 Limpar banheiros                   Diariamente    │
│  🧺 Lavar roupa                        Seg, Qua, Sex  │
│  📦 Organizar quartos                  Semanal        │
│  🧹 Limpar sala                        Diariamente    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## Componentes

### Lista de Funcionários

```tsx
interface EmployeeListProps {
  employees: Employee[]
  showInactive: boolean
  onEdit: (employee: Employee) => void
  onToggleActive: (employeeId: string, active: boolean) => void
}
```

### Card de Funcionário

```tsx
interface EmployeeCardProps {
  employee: Employee & { _count: { tasks: number } }
  onEdit: () => void
  onToggleActive: () => void
}
```

**Informações exibidas:**
- Avatar (iniciais ou ícone)
- Nome
- Função
- Dias de trabalho
- Contagem de tarefas
- Status (ativo/inativo)

### Formulário de Funcionário

```tsx
interface EmployeeFormProps {
  employee?: Employee
  onSubmit: (data: EmployeeFormData) => void
  onCancel: () => void
}

interface EmployeeFormData {
  name: string
  role: Role
  workDays: number[]
  active: boolean
}
```

### Seletor de Dias

```tsx
interface WorkDaysSelectorProps {
  value: number[] // 0-6
  onChange: (days: number[]) => void
}
```

**Atalhos:**
- "Dias úteis": [1, 2, 3, 4, 5]
- "Todos": [0, 1, 2, 3, 4, 5, 6]
- "Limpar": []

## Funções (Roles)

| Role | Label | Descrição |
|------|-------|-----------|
| FAXINEIRA | Faxineira | Limpeza geral da casa |
| COZINHEIRA | Cozinheira | Preparo de refeições |
| BABA | Babá | Cuidado de crianças |
| JARDINEIRO | Jardineiro | Cuidado do jardim |
| MOTORISTA | Motorista | Transporte |
| OUTRO | Outro | Função não listada |

## Validação

### Nome
- Obrigatório
- Mínimo: 2 caracteres
- Máximo: 100 caracteres

### Função
- Obrigatória
- Deve ser valor válido do enum

### Dias de trabalho
- Obrigatório (pelo menos 1 dia)
- Valores entre 0 e 6
- Sem duplicatas

## Regras de Negócio

### Desativação
- Funcionário inativo não aparece no dashboard
- Tarefas do funcionário permanecem, mas não são agendadas
- Histórico de ocorrências é mantido
- Pode ser reativado a qualquer momento

### Exclusão
- Não é possível excluir, apenas desativar
- Preserva integridade referencial
- Mantém histórico completo

### Dias de trabalho
- Afeta quais tarefas aparecem no dashboard
- Tarefa atribuída + funcionário não trabalha = tarefa não aparece
- Mudança nos dias não afeta ocorrências passadas

## Fluxo de Criação

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Listar    │────▶│  Formulário │────▶│   Validar   │
│Funcionários │     │   de Func.  │     │   Dados     │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                          ┌────────────────────┘
                          ▼
                    ┌─────────────┐     ┌─────────────┐
                    │   Salvar    │────▶│  Atualizar  │
                    │   no DB     │     │    Lista    │
                    └─────────────┘     └─────────────┘
```

## API Calls

### Listar funcionários

```typescript
// GET /api/employees?active=true

const { data: employees } = await fetch('/api/employees?active=true')
  .then(r => r.json())
```

### Criar funcionário

```typescript
// POST /api/employees

const createEmployee = async (data: EmployeeFormData) => {
  const response = await fetch('/api/employees', {
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

### Atualizar funcionário

```typescript
// PUT /api/employees/:id

const updateEmployee = async (id: string, data: Partial<EmployeeFormData>) => {
  const response = await fetch(`/api/employees/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

  return response.json()
}
```

### Desativar funcionário

```typescript
// DELETE /api/employees/:id (soft delete)

const deactivateEmployee = async (id: string) => {
  await fetch(`/api/employees/${id}`, { method: 'DELETE' })
}
```

## Exibição de Dias

```typescript
const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function workDaysToText(workDays: number[]): string {
  // Ordenar dias
  const sorted = [...workDays].sort()

  // Casos especiais
  if (sorted.length === 7) return 'Todos os dias'
  if (sorted.length === 5 && !sorted.includes(0) && !sorted.includes(6)) {
    return 'Dias úteis'
  }
  if (sorted.length === 2 && sorted.includes(0) && sorted.includes(6)) {
    return 'Fins de semana'
  }

  // Lista de dias
  return sorted.map(d => dayNames[d]).join(', ')
}
```

## Avatar

Geração de avatar baseado nas iniciais:

```typescript
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
  ]
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}
```

## Testes

### Unitários
- Validação de formulário
- Conversão de dias para texto
- Geração de avatar

### Integração
- CRUD completo
- Validação no backend
- Relação com tarefas

### E2E
- Criar funcionário
- Editar dias de trabalho
- Desativar e verificar que tarefas não aparecem
- Reativar funcionário
