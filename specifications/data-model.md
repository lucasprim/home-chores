# Modelo de Dados

## Diagrama ER

```
┌─────────────────┐       ┌─────────────────┐
│    Employee     │       │      Task       │
├─────────────────┤       ├─────────────────┤
│ id              │───┐   │ id              │
│ name            │   │   │ title           │
│ role            │   │   │ description     │
│ workDays        │   │   │ category        │
│ active          │   │   │ rrule           │
│ createdAt       │   └──▶│ employeeId      │
│ updatedAt       │       │ active          │
└─────────────────┘       │ createdAt       │
                          │ updatedAt       │
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │ TaskOccurrence  │
                          ├─────────────────┤
                          │ id              │
                          │ taskId          │
                          │ date            │
                          │ completed       │
                          │ completedAt     │
                          │ notes           │
                          └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│      Dish       │       │  MealSchedule   │
├─────────────────┤       ├─────────────────┤
│ id              │◀──────│ id              │
│ name            │       │ date            │
│ description     │       │ mealType        │
│ category        │       │ dishId          │
│ prepTime        │       │ employeeId      │◀─── Employee
│ servings        │       │ notes           │
│ ingredients     │       │ createdAt       │
│ active          │       └─────────────────┘
│ createdAt       │
│ updatedAt       │
└─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│    Settings     │       │    PrintJob     │
├─────────────────┤       ├─────────────────┤
│ id              │       │ id              │
│ key             │       │ name            │
│ value           │       │ cronExpression  │
│ updatedAt       │       │ type            │
└─────────────────┘       │ employeeId      │◀─── Employee (opcional)
                          │ enabled         │
                          │ lastRunAt       │
                          │ createdAt       │
                          │ updatedAt       │
                          └─────────────────┘

                          ┌─────────────────┐
                          │   PrintLog      │
                          ├─────────────────┤
                          │ id              │
                          │ printJobId      │
                          │ status          │
                          │ error           │
                          │ createdAt       │
                          └─────────────────┘
```

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// FUNCIONÁRIOS
// ============================================

model Employee {
  id        String   @id @default(cuid())
  name      String
  role      Role
  workDays  Int[]    // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tasks         Task[]
  mealSchedules MealSchedule[]
  printJobs     PrintJob[]

  @@map("employees")
}

enum Role {
  FAXINEIRA    // Limpeza geral
  COZINHEIRA   // Preparo de refeições
  BABA         // Cuidado de crianças
  JARDINEIRO   // Cuidado do jardim
  MOTORISTA    // Transporte
  OUTRO        // Outros

  @@map("role")
}

// ============================================
// TAREFAS
// ============================================

model Task {
  id          String   @id @default(cuid())
  title       String
  description String?
  category    Category
  rrule       String   // Formato iCalendar RRULE
  employeeId  String?
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  employee    Employee?        @relation(fields: [employeeId], references: [id])
  occurrences TaskOccurrence[]

  @@index([employeeId])
  @@index([active])
  @@map("tasks")
}

enum Category {
  LIMPEZA      // Limpeza de ambientes
  COZINHA      // Tarefas de cozinha
  LAVANDERIA   // Lavar, passar, dobrar
  ORGANIZACAO  // Organização geral
  COMPRAS      // Compras e mercado
  MANUTENCAO   // Manutenção da casa
  JARDIM       // Cuidados com jardim
  CRIANCAS     // Cuidado de crianças
  PETS         // Cuidado de animais
  OUTRO        // Outros

  @@map("category")
}

model TaskOccurrence {
  id          String    @id @default(cuid())
  taskId      String
  date        DateTime  @db.Date
  completed   Boolean   @default(false)
  completedAt DateTime?
  notes       String?

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@unique([taskId, date])
  @@index([date])
  @@index([taskId, date])
  @@map("task_occurrences")
}

// ============================================
// CARDÁPIO
// ============================================

model Dish {
  id          String       @id @default(cuid())
  name        String
  description String?
  category    DishCategory
  prepTime    Int?         // Tempo de preparo em minutos
  servings    Int?         // Número de porções
  ingredients String[]     // Lista de ingredientes
  active      Boolean      @default(true)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  mealSchedules MealSchedule[]

  @@map("dishes")
}

enum DishCategory {
  CAFE_MANHA   // Café da manhã
  ALMOCO       // Almoço
  JANTAR       // Jantar
  LANCHE       // Lanche
  SOBREMESA    // Sobremesa
  BEBIDA       // Bebidas

  @@map("dish_category")
}

model MealSchedule {
  id         String   @id @default(cuid())
  date       DateTime @db.Date
  mealType   MealType
  dishId     String
  employeeId String?  // Quem vai preparar
  notes      String?
  createdAt  DateTime @default(now())

  dish     Dish      @relation(fields: [dishId], references: [id])
  employee Employee? @relation(fields: [employeeId], references: [id])

  @@unique([date, mealType])
  @@index([date])
  @@map("meal_schedules")
}

enum MealType {
  CAFE_MANHA
  ALMOCO
  JANTAR

  @@map("meal_type")
}

// ============================================
// CONFIGURAÇÕES
// ============================================

model Settings {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String   // JSON string para valores complexos
  updatedAt DateTime @updatedAt

  @@map("settings")
}

// Chaves de configuração esperadas:
// - house_name: Nome da casa (exibido nas impressões)
// - printer_ip: IP da impressora térmica
// - printer_type: Tipo da impressora (EPSON, STAR, etc)
// - app_pin: PIN de acesso ao app
// - default_print_time: Horário padrão para impressão automática

// ============================================
// IMPRESSÃO
// ============================================

model PrintJob {
  id             String    @id @default(cuid())
  name           String
  cronExpression String    // Formato cron (ex: "0 7 * * 1-5")
  type           PrintType
  employeeId     String?   // Se null, imprime para todos
  enabled        Boolean   @default(true)
  lastRunAt      DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  employee Employee?  @relation(fields: [employeeId], references: [id])
  logs     PrintLog[]

  @@map("print_jobs")
}

enum PrintType {
  DAILY_TASKS   // Lista de tarefas do dia
  SINGLE_TASK   // Ticket de tarefa individual
  WEEKLY_MENU   // Cardápio da semana

  @@map("print_type")
}

model PrintLog {
  id         String      @id @default(cuid())
  printJobId String?
  status     PrintStatus
  error      String?
  createdAt  DateTime    @default(now())

  printJob PrintJob? @relation(fields: [printJobId], references: [id], onDelete: SetNull)

  @@index([printJobId])
  @@index([createdAt])
  @@map("print_logs")
}

enum PrintStatus {
  SUCCESS
  FAILED
  SKIPPED // Ex: nenhuma tarefa para imprimir

  @@map("print_status")
}
```

## Entidades

### Employee (Funcionário)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | ID único (CUID) |
| name | string | Nome do funcionário |
| role | Role | Função (FAXINEIRA, COZINHEIRA, etc.) |
| workDays | int[] | Dias de trabalho (0=Dom a 6=Sáb) |
| active | boolean | Se está ativo |
| createdAt | datetime | Data de criação |
| updatedAt | datetime | Data de atualização |

**Regras:**
- Nome é obrigatório e deve ter pelo menos 2 caracteres
- workDays deve conter valores entre 0 e 6
- Funcionário inativo não aparece no dashboard

### Task (Tarefa)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | ID único (CUID) |
| title | string | Título da tarefa |
| description | string? | Descrição detalhada |
| category | Category | Categoria da tarefa |
| rrule | string | Regra de recorrência (iCalendar) |
| employeeId | string? | Funcionário responsável |
| active | boolean | Se está ativa |
| createdAt | datetime | Data de criação |
| updatedAt | datetime | Data de atualização |

**Regras:**
- Título é obrigatório
- rrule segue formato iCalendar (RFC 5545)
- Tarefa sem employeeId é não atribuída
- Tarefa inativa não gera ocorrências

### TaskOccurrence (Ocorrência)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | ID único (CUID) |
| taskId | string | ID da tarefa |
| date | date | Data da ocorrência |
| completed | boolean | Se foi concluída |
| completedAt | datetime? | Quando foi concluída |
| notes | string? | Observações |

**Regras:**
- Combinação taskId + date é única
- Ocorrências são criadas sob demanda (lazy)
- completedAt é preenchido automaticamente ao marcar completed

### Dish (Prato)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | ID único (CUID) |
| name | string | Nome do prato |
| description | string? | Descrição/receita |
| category | DishCategory | Tipo de refeição |
| prepTime | int? | Tempo de preparo (minutos) |
| servings | int? | Número de porções |
| ingredients | string[] | Lista de ingredientes |
| active | boolean | Se está ativo |

**Regras:**
- Nome é obrigatório
- Prato inativo não aparece no planejamento

### MealSchedule (Cardápio)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | ID único (CUID) |
| date | date | Data da refeição |
| mealType | MealType | Tipo (CAFE_MANHA, ALMOCO, JANTAR) |
| dishId | string | ID do prato |
| employeeId | string? | Quem vai preparar |
| notes | string? | Observações |

**Regras:**
- Combinação date + mealType é única
- employeeId é opcional (qualquer um pode preparar)

### Settings (Configurações)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | ID único (CUID) |
| key | string | Chave única |
| value | string | Valor (JSON serializado) |
| updatedAt | datetime | Última atualização |

**Chaves esperadas:**
- `house_name`: Nome da casa
- `printer_ip`: IP da impressora
- `printer_type`: Tipo da impressora
- `app_pin`: PIN de acesso
- `default_print_time`: Horário padrão

### PrintJob (Job de Impressão)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | ID único (CUID) |
| name | string | Nome do job |
| cronExpression | string | Expressão cron |
| type | PrintType | Tipo de impressão |
| employeeId | string? | Funcionário específico |
| enabled | boolean | Se está ativo |
| lastRunAt | datetime? | Última execução |

**Regras:**
- cronExpression deve ser válida
- Se employeeId é null, imprime para todos
- Job desabilitado não executa

### PrintLog (Log de Impressão)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | ID único (CUID) |
| printJobId | string? | ID do job (null se manual) |
| status | PrintStatus | SUCCESS, FAILED, SKIPPED |
| error | string? | Mensagem de erro |
| createdAt | datetime | Data/hora da tentativa |

## Formato RRULE

Exemplos de regras de recorrência:

```
# Diariamente
FREQ=DAILY

# Dias úteis (seg-sex)
FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR

# Semanal às segundas
FREQ=WEEKLY;BYDAY=MO

# Mensal no dia 15
FREQ=MONTHLY;BYMONTHDAY=15

# Mensal na primeira segunda
FREQ=MONTHLY;BYDAY=1MO

# Quinzenal às terças
FREQ=WEEKLY;INTERVAL=2;BYDAY=TU
```

## Seed Data

```typescript
// prisma/seed.ts

import { PrismaClient, Role, Category, DishCategory } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Settings padrão
  await prisma.settings.createMany({
    data: [
      { key: 'house_name', value: '"Minha Casa"' },
      { key: 'printer_ip', value: '"192.168.1.230"' },
      { key: 'printer_type', value: '"EPSON"' },
      { key: 'app_pin', value: '"1234"' },
      { key: 'default_print_time', value: '"07:00"' },
    ],
    skipDuplicates: true,
  })

  // Funcionário exemplo
  const employee = await prisma.employee.create({
    data: {
      name: 'Maria',
      role: Role.FAXINEIRA,
      workDays: [1, 2, 3, 4, 5], // Seg-Sex
    },
  })

  // Tarefa exemplo
  await prisma.task.create({
    data: {
      title: 'Limpar cozinha',
      description: 'Limpar pia, fogão e bancadas',
      category: Category.LIMPEZA,
      rrule: 'FREQ=DAILY',
      employeeId: employee.id,
    },
  })

  // Prato exemplo
  await prisma.dish.create({
    data: {
      name: 'Arroz com feijão',
      category: DishCategory.ALMOCO,
      prepTime: 60,
      servings: 4,
      ingredients: ['Arroz', 'Feijão', 'Alho', 'Sal', 'Óleo'],
    },
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

## Migrations

Comandos úteis:

```bash
# Criar migration
pnpm prisma migrate dev --name init

# Aplicar migrations em produção
pnpm prisma migrate deploy

# Reset do banco (dev only)
pnpm prisma migrate reset

# Gerar client
pnpm prisma generate

# Abrir Prisma Studio
pnpm prisma studio
```
