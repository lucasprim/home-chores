# Arquitetura

## Stack Tecnológico

| Componente | Tecnologia | Versão | Justificativa |
|------------|------------|--------|---------------|
| Framework | Next.js | 15.x | App Router, Server Components, API Routes |
| Runtime | Node.js | 20 LTS | Suporte a ES modules, performance |
| Linguagem | TypeScript | 5.x | Type safety, melhor DX |
| Styling | Tailwind CSS | 3.x | Utility-first, mobile-first |
| Database | PostgreSQL | 16.x | Robusto, JSONB, full-text search |
| ORM | Prisma | 5.x | Type-safe, migrations, studio |
| Scheduler | node-cron | 3.x | Cron jobs em processo |
| Printer | node-thermal-printer | 4.x | Integração ESC/POS existente |
| Container | Docker | 24.x | Fácil deploy em Portainer |

## Estrutura do Projeto

```
home-chores/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout com providers
│   ├── page.tsx                  # Redirect para /today
│   ├── globals.css               # Tailwind imports
│   ├── (auth)/                   # Grupo de rotas com auth
│   │   ├── layout.tsx            # Auth check layout
│   │   ├── today/
│   │   │   └── page.tsx          # Dashboard do dia
│   │   ├── tasks/
│   │   │   ├── page.tsx          # Lista de tarefas
│   │   │   ├── new/
│   │   │   │   └── page.tsx      # Criar tarefa
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Editar tarefa
│   │   ├── employees/
│   │   │   ├── page.tsx          # Lista de funcionários
│   │   │   ├── new/
│   │   │   │   └── page.tsx      # Criar funcionário
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Editar funcionário
│   │   ├── menu/
│   │   │   ├── page.tsx          # Calendário de cardápio
│   │   │   └── dishes/
│   │   │       └── page.tsx      # Repertório de pratos
│   │   ├── print/
│   │   │   └── page.tsx          # Impressão manual
│   │   └── settings/
│   │       └── page.tsx          # Configurações
│   ├── login/
│   │   └── page.tsx              # Tela de PIN
│   └── api/                      # API Routes
│       ├── auth/
│       │   └── route.ts          # Verificação de PIN
│       ├── employees/
│       │   ├── route.ts          # GET, POST
│       │   └── [id]/
│       │       └── route.ts      # GET, PUT, DELETE
│       ├── tasks/
│       │   ├── route.ts          # GET, POST
│       │   └── [id]/
│       │       └── route.ts      # GET, PUT, DELETE
│       ├── occurrences/
│       │   └── route.ts          # GET (by date), PUT (toggle)
│       ├── dishes/
│       │   ├── route.ts          # GET, POST
│       │   └── [id]/
│       │       └── route.ts      # GET, PUT, DELETE
│       ├── meal-schedule/
│       │   ├── route.ts          # GET (by month), POST
│       │   └── [id]/
│       │       └── route.ts      # PUT, DELETE
│       ├── print/
│       │   └── route.ts          # POST (trigger print)
│       ├── print-jobs/
│       │   ├── route.ts          # GET, POST
│       │   └── [id]/
│       │       └── route.ts      # PUT, DELETE
│       └── settings/
│           └── route.ts          # GET, PUT
├── components/
│   ├── ui/                       # Componentes base
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── checkbox.tsx
│   │   ├── card.tsx
│   │   ├── modal.tsx
│   │   ├── toast.tsx
│   │   └── calendar.tsx
│   ├── layout/
│   │   ├── header.tsx            # Cabeçalho com navegação
│   │   ├── nav.tsx               # Menu de navegação
│   │   └── page-container.tsx    # Container padrão de página
│   ├── tasks/
│   │   ├── task-card.tsx         # Card de tarefa
│   │   ├── task-form.tsx         # Formulário de tarefa
│   │   ├── task-list.tsx         # Lista de tarefas
│   │   └── recurrence-picker.tsx # Seletor de recorrência
│   ├── employees/
│   │   ├── employee-card.tsx
│   │   ├── employee-form.tsx
│   │   └── employee-avatar.tsx
│   ├── menu/
│   │   ├── dish-card.tsx
│   │   ├── dish-form.tsx
│   │   ├── meal-calendar.tsx
│   │   └── meal-day-card.tsx
│   └── print/
│       ├── print-preview.tsx
│       └── print-job-form.tsx
├── lib/
│   ├── db.ts                     # Prisma client singleton
│   ├── auth.ts                   # Funções de autenticação
│   ├── printer.ts                # Integração com impressora
│   ├── scheduler.ts              # Gerenciamento de cron jobs
│   ├── rrule.ts                  # Helpers para recorrência
│   └── utils.ts                  # Funções utilitárias
├── prisma/
│   ├── schema.prisma             # Schema do banco
│   ├── migrations/               # Migrations
│   └── seed.ts                   # Dados iniciais
├── public/
│   └── icons/                    # Ícones de categoria
├── scripts/
│   └── print-maid-tasks.ts       # Script existente
├── types/
│   └── index.ts                  # Tipos TypeScript
├── docker-compose.yml            # Compose com app + postgres
├── Dockerfile                    # Build da aplicação
├── .env.example                  # Variáveis de ambiente
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
└── package.json
```

## Fluxo de Dados

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│   Next.js   │────▶│  PostgreSQL │
│   (React)   │◀────│  (Server)   │◀────│  (Docker)   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Impressora │
                    │   Térmica   │
                    └─────────────┘
```

### Componentes

1. **Browser (React)**
   - Interface do usuário
   - Formulários e interações
   - State management local (React hooks)

2. **Next.js Server**
   - Server Components para SSR
   - API Routes para operações CRUD
   - Prisma para acesso ao banco
   - node-cron para agendamentos
   - node-thermal-printer para impressão

3. **PostgreSQL**
   - Persistência de dados
   - Executado em container Docker
   - Volume para dados persistentes

4. **Impressora Térmica**
   - Conexão via rede (TCP/IP)
   - Protocolo ESC/POS
   - Papel 80mm

## Autenticação

Sistema simples de PIN para proteção básica:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Login    │────▶│  Verificar  │────▶│   Cookie    │
│  (PIN Form) │     │     PIN     │     │  httpOnly   │
└─────────────┘     └─────────────┘     └─────────────┘
```

- PIN configurável nas settings
- Cookie httpOnly para sessão
- Middleware verifica cookie em rotas protegidas
- Sem expiração (sessão permanente até logout)

## Agendamento (Cron)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  PrintJob   │────▶│  node-cron  │────▶│   Printer   │
│  (Database) │     │  (Runtime)  │     │   Service   │
└─────────────┘     └─────────────┘     └─────────────┘
```

- Jobs salvos no banco de dados
- Carregados no startup da aplicação
- Executados pelo node-cron
- Logs salvos no banco

## Considerações de Deploy

### Requisitos do Host
- Docker e Docker Compose
- Acesso à rede local (impressora)
- Porta 3000 disponível

### Volumes
- `postgres_data`: dados do PostgreSQL
- `app_data`: uploads e cache (se houver)

### Variáveis de Ambiente
```env
DATABASE_URL=postgresql://user:pass@db:5432/home_chores
APP_PIN=1234
PRINTER_IP=192.168.1.230
TZ=America/Sao_Paulo
```

## Decisões Arquiteturais

### Por que Next.js App Router?
- Server Components reduzem JS no cliente
- Server Actions para mutações simplificadas
- Layouts aninhados para estrutura consistente
- API Routes integradas

### Por que Prisma?
- Schema declarativo e type-safe
- Migrations automáticas
- Prisma Studio para debug
- Suporte excelente a PostgreSQL

### Por que PostgreSQL?
- Robusto e confiável
- JSONB para dados flexíveis (rrule, settings)
- Suporte a arrays (dias da semana)
- Fácil backup e restore

### Por que node-cron ao invés de cron externo?
- Simplifica deploy (tudo em um container)
- Acesso direto ao banco e serviços
- Fácil gerenciamento via API
- Logs integrados
