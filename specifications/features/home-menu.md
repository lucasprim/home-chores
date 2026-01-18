# Cardápio - Planejamento de Refeições

## Visão Geral

Sistema de planejamento de cardápio mensal com repertório de pratos e suporte a todas as categorias de refeições.

## User Stories

### US-01: Gerenciar repertório de pratos
**Como** usuário
**Quero** cadastrar pratos que fazemos em casa
**Para** usar no planejamento do cardápio

### US-02: Planejar cardápio mensal
**Como** usuário
**Quero** definir o que será servido em cada refeição
**Para** organizar as compras e preparo

### US-03: Gerar cardápio aleatório
**Como** usuário
**Quero** gerar um cardápio aleatório
**Para** ter sugestões variadas automaticamente

### US-04: Ver cardápio da semana
**Como** usuário
**Quero** visualizar o cardápio em formato de calendário
**Para** ter visão geral da semana

## Wireframes

### Calendário de Cardápio

```
┌────────────────────────────────────────────────────────┐
│  Cardápio                  [← Janeiro 2024 →] [Pratos] │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐         │
│  │ Dom │ Seg │ Ter │ Qua │ Qui │ Sex │ Sáb │         │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤         │
│  │     │     │     │  1  │  2  │  3  │  4  │         │
│  │     │     │     │☕...│☕...│☕...│☕...│         │
│  │     │     │     │🍚...│🍚...│🍚...│🍚...│         │
│  │     │     │     │🍲...│🍲...│🍲...│🍲...│         │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤         │
│  │ ... │ ... │ ... │ ... │ ... │ ... │ ... │         │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┘         │
│                                                        │
│  Legenda: ☕ Café • 🍚 Almoço • 🍲 Jantar •           │
│           🥪 Lanche • 🍰 Sobremesa • 🥤 Bebida        │
│                                                        │
│  [Randomizar mês]                        [Imprimir]    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Detalhe do Dia (Modal)

```
┌────────────────────────────────────────┐
│  16 de Janeiro, Terça-feira        [×] │
├────────────────────────────────────────┤
│                                        │
│  ☕ Café da manhã                      │
│  ┌──────────────────────────────────┐ │
│  │ Pão com manteiga             ▼   │ │
│  └──────────────────────────────────┘ │
│                                        │
│  🍚 Almoço                             │
│  ┌──────────────────────────────────┐ │
│  │ Macarrão à bolonhesa         ▼   │ │
│  └──────────────────────────────────┘ │
│                                        │
│  🍲 Jantar                             │
│  ┌──────────────────────────────────┐ │
│  │ Salada completa              ▼   │ │
│  └──────────────────────────────────┘ │
│                                        │
│  🥪 Lanche                             │
│  ┌──────────────────────────────────┐ │
│  │ (não definido)               ▼   │ │
│  └──────────────────────────────────┘ │
│                                        │
│  🍰 Sobremesa                          │
│  ┌──────────────────────────────────┐ │
│  │ Pudim                        ▼   │ │
│  └──────────────────────────────────┘ │
│                                        │
│  🥤 Bebida                             │
│  ┌──────────────────────────────────┐ │
│  │ Suco de laranja              ▼   │ │
│  └──────────────────────────────────┘ │
│                                        │
│              [Cancelar]  [Salvar]      │
│                                        │
└────────────────────────────────────────┘
```

### Repertório de Pratos

```
┌────────────────────────────────────────────────────────┐
│  ← Pratos                               [+ Novo Prato] │
├────────────────────────────────────────────────────────┤
│  [ ] Mostrar inativos                                  │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌────────────────────────────────────────────────────┐│
│  │ Arroz com feijão   [🍚 Almoço] [🍲 Jantar]  [Edit] ││
│  └────────────────────────────────────────────────────┘│
│                                                        │
│  ┌────────────────────────────────────────────────────┐│
│  │ Macarrão à bolonhesa    [🍚 Almoço]         [Edit] ││
│  └────────────────────────────────────────────────────┘│
│                                                        │
│  ┌────────────────────────────────────────────────────┐│
│  │ Salada completa   [🍚 Almoço] [🍲 Jantar]   [Edit] ││
│  └────────────────────────────────────────────────────┘│
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Formulário de Prato (Simplificado)

```
┌────────────────────────────────────────────────────────┐
│  Novo Prato                                        [×] │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Nome *                                                │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Arroz com feijão                                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Categorias *                                          │
│  ┌──────────────────────────────────────────────────┐ │
│  │ [☕ Café] [🍚 Almoço✓] [🍲 Jantar✓] [🥪 Lanche]  │ │
│  │ [🍰 Sobremesa] [🥤 Bebida]                        │ │
│  └──────────────────────────────────────────────────┘ │
│  Selecione todas as refeições em que pode ser servido  │
│                                                        │
│                        [Cancelar]  [Salvar]            │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## Componentes

### Calendário Mensal

```tsx
interface MealCalendarProps {
  month: Date
  schedules: MealSchedule[]
  onDayClick: (date: Date) => void
  onMonthChange: (month: Date) => void
}
```

### Card do Dia

```tsx
interface MealDayCardProps {
  date: Date
  lunch?: MealSchedule
  dinner?: MealSchedule
  onClick: () => void
}
```

### Modal de Edição do Dia

```tsx
interface MealDayModalProps {
  date: Date
  dishes: Dish[]
  currentSchedule: Record<MealType, MealSchedule | undefined>
  onSave: (schedules: MealScheduleInput[]) => void
  onClose: () => void
}
```

### Lista de Pratos

```tsx
interface DishListProps {
  dishes: Dish[]
  onEdit: (dish: Dish) => void
  onToggleActive: (dishId: string, active: boolean) => void
}
```

### Formulário de Prato

```tsx
interface DishFormProps {
  dish?: Dish
  onSubmit: (data: DishFormData) => void
  onCancel: () => void
}

interface DishFormData {
  name: string
  categories: DishCategory[]  // Um prato pode ter múltiplas categorias
  active: boolean
}
```

## Categorias de Pratos

| Categoria | Ícone | Uso |
|-----------|-------|-----|
| CAFE_MANHA | ☕ | Café da manhã |
| ALMOCO | 🍚 | Almoço |
| JANTAR | 🍲 | Jantar |
| LANCHE | 🥪 | Lanche |
| SOBREMESA | 🍰 | Sobremesa |
| BEBIDA | 🥤 | Bebidas |

## Validação

### Prato

| Campo | Regra |
|-------|-------|
| name | Obrigatório, 2-100 caracteres |
| categories | Obrigatório, pelo menos uma categoria válida |

### Agendamento

| Campo | Regra |
|-------|-------|
| date | Obrigatória, formato válido |
| mealType | Obrigatório, enum válido (CAFE_MANHA, ALMOCO, JANTAR, LANCHE, SOBREMESA, BEBIDA) |
| dishId | Obrigatório se agendando |
| notes | Opcional, máximo 200 caracteres |

## Randomização

### Algoritmo

```typescript
async function randomizeMonth(
  startDate: Date,
  endDate: Date,
  mealTypes: MealType[],
  options: RandomizeOptions
): Promise<{ created: number; skipped: number }> {
  const dishes = await getDishes({ active: true })
  const dishByCategory = groupBy(dishes, 'category')

  let created = 0
  let skipped = 0

  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    for (const mealType of mealTypes) {
      // Verificar se já existe agendamento
      const existing = await getMealSchedule(date, mealType)

      if (existing && !options.overwrite) {
        skipped++
        continue
      }

      // Selecionar prato aleatório da categoria correspondente
      const category = mealTypeToCategory(mealType)
      const availableDishes = dishByCategory[category] || []

      if (availableDishes.length === 0) {
        skipped++
        continue
      }

      const randomDish = availableDishes[Math.floor(Math.random() * availableDishes.length)]

      // Criar ou atualizar agendamento
      await upsertMealSchedule({
        date,
        mealType,
        dishId: randomDish.id
      })

      created++
    }
  }

  return { created, skipped }
}
```

### Opções

```typescript
interface RandomizeOptions {
  overwrite: boolean      // Sobrescrever existentes
  mealTypes: MealType[]   // Quais refeições randomizar
  avoidRepeat: boolean    // Evitar repetição na semana (futuro)
}
```

## Fluxo de Edição

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Clicar    │────▶│   Abrir     │────▶│  Selecionar │
│   no Dia    │     │   Modal     │     │   Pratos    │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                          ┌────────────────────┘
                          ▼
┌─────────────┐     ┌─────────────┐
│   Fechar    │◀────│   Salvar    │
│   Modal     │     │   no DB     │
└─────────────┘     └─────────────┘
```

## API Calls

### Carregar cardápio do mês

```typescript
// GET /api/meal-schedule?month=2024-01

const { data: schedules } = await fetch('/api/meal-schedule?month=2024-01')
  .then(r => r.json())
```

### Salvar agendamento

```typescript
// POST /api/meal-schedule

const saveMealSchedule = async (data: MealScheduleInput) => {
  const response = await fetch('/api/meal-schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

  return response.json()
}
```

### Randomizar mês

```typescript
// POST /api/meal-schedule/randomize

const randomizeMonth = async (options: RandomizeRequest) => {
  const response = await fetch('/api/meal-schedule/randomize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  })

  return response.json()
}
```

### CRUD de pratos

```typescript
// GET /api/dishes
// POST /api/dishes
// PUT /api/dishes/:id
// DELETE /api/dishes/:id
```

## Estados do Calendário

### Carregando
- Skeleton nos dias
- Navegação desabilitada

### Mês vazio
- Dias em branco
- Sugestão de randomizar

### Parcialmente preenchido
- Alguns dias com ícones
- Dias vazios clicáveis

### Mês completo
- Todos os dias com ícones
- Visual completo

## Indicadores Visuais

### Dia com refeições
```
┌─────┐
│ 16  │
│ 🍚  │ ← Almoço
│ 🍲  │ ← Jantar
└─────┘
```

### Dia parcial
```
┌─────┐
│ 17  │
│ 🍚  │ ← Apenas almoço
│     │
└─────┘
```

### Dia atual
```
┌─────┐
│ ●16 │ ← Destaque
│ 🍚  │
│ 🍲  │
└─────┘
```

## Testes

### Unitários
- Algoritmo de randomização
- Agrupamento por categoria
- Validação de pratos

### Integração
- CRUD de pratos
- Agendamento de refeições
- Randomização

### E2E
- Criar prato e usar no cardápio
- Navegar entre meses
- Randomizar e verificar
- Editar dia específico
