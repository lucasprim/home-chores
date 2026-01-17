# Home Chores - Especificações

Sistema de **geração de listas impressas** para tarefas domésticas e cardápios.

## Visão Geral

O Home Chores é um **gerador de listas para impressão térmica** - **NÃO** é um gerenciador de tarefas tradicional com estados pendente/fazendo/concluído.

### Conceito Fundamental

Este sistema decide **o que será impresso** em uma impressora térmica para um determinado dia. Não há feedback do sistema sobre conclusão de tarefas - por design, pois não há tablets espalhados pela casa para marcar tarefas como concluídas.

### O que o sistema faz:

- **Gerenciar funcionários** (faxineira, cozinheira, etc.) e seus dias de trabalho
- **Definir tarefas recorrentes** - a recorrência determina em quais dias a tarefa aparece na lista impressa
- **Definir tarefas especiais** - tarefas que imprimem em papel separado, com data de vencimento informativa
- **Visualizar preview** - ver o que será impresso para qualquer data
- **Planejar cardápios** mensais
- **Imprimir listas** de tarefas em impressora térmica (manual ou automático)

### O que o sistema NÃO faz:

- Rastrear se tarefas foram concluídas
- Manter estados de tarefas (pendente/fazendo/concluído)
- Vincular tarefas a datas específicas após impressão

## Estrutura da Documentação

```
specifications/
├── README.md           # Este arquivo - visão geral e glossário
├── architecture.md     # Stack tecnológico e estrutura do projeto
├── data-model.md       # Schema do banco de dados e entidades
├── api.md              # Endpoints da API REST
├── deployment.md       # Deploy com Docker e Portainer
└── features/
    ├── today.md        # Dashboard de tarefas do dia
    ├── tasks.md        # Gerenciamento de tarefas
    ├── employees.md    # Perfis de funcionários
    ├── settings.md     # Configurações do app
    ├── print.md        # Integração com impressora térmica
    ├── home-menu.md    # Planejamento de cardápio
    └── auto-print.md   # Impressão automática agendada
```

## Como Ler Esta Documentação

1. Comece por `architecture.md` para entender a stack tecnológica
2. Leia `data-model.md` para entender as entidades e relacionamentos
3. Explore as features em `features/` para requisitos específicos
4. Consulte `api.md` para detalhes de implementação dos endpoints
5. Use `deployment.md` para instruções de deploy

## Glossário

| Termo | Descrição |
|-------|-----------|
| **Funcionário** | Pessoa que trabalha na casa (faxineira, cozinheira, etc.) |
| **Tarefa** | Atividade recorrente com padrão de repetição (limpar cozinha diariamente, lavar roupa seg/qua/sex, etc.) |
| **Tarefa Especial** | Tarefa que imprime em papel separado, com data de vencimento informativa (ex: "Limpar vidros - Vence: 20/01") |
| **Recorrência (RRULE)** | Padrão que determina em quais dias uma tarefa aparece na lista impressa. Armazenado como string, parseado em runtime. |
| **Fuso Horário** | Configuração que define como interpretar datas para cálculo de recorrência |
| **Cardápio** | Plano de refeições para um período |
| **Prato** | Item do repertório de refeições da casa |
| **Print Job** | Job agendado para imprimir tarefas automaticamente em horários específicos |
| **ESC/POS** | Protocolo de comunicação com impressoras térmicas |

## Convenções

### Idioma
- Interface: **Português (PT-BR)**
- Código: **Inglês**
- Documentação técnica: **Inglês/Português**

### Formato de Data
- Exibição: `DD/MM/YYYY`
- API: ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`)

### Horários
- Fuso horário: America/Sao_Paulo
- Formato de exibição: 24h (`HH:mm`)

## Requisitos Não-Funcionais

### Segurança
- Autenticação por PIN/senha simples
- Acesso apenas na rede local
- Sem dados sensíveis (apenas gerenciamento doméstico)

### Performance
- Tempo de resposta < 500ms para operações comuns
- Suporte a impressão em < 5 segundos

### Disponibilidade
- Deploy em container Docker
- Reinício automático em caso de falha
- Dados persistidos em volume Docker

### Compatibilidade
- Desktop: Chrome, Firefox, Safari (últimas 2 versões)
- Mobile: iOS Safari, Chrome Android
- Design responsivo mobile-first

## Links Úteis

- [Prisma Docs](https://www.prisma.io/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [ESC/POS Commands](https://reference.epson-biz.com/modules/ref_escpos/)
