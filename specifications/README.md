# Home Chores - Especificações

Sistema de gerenciamento de tarefas domésticas e funcionários para automação residencial.

## Visão Geral

O Home Chores é uma aplicação web para gerenciar tarefas domésticas, funcionários e cardápios. O sistema permite:

- Gerenciar funcionários (faxineira, cozinheira, etc.)
- Criar e atribuir tarefas com recorrência
- Visualizar tarefas do dia por funcionário
- Planejar cardápios mensais
- Imprimir listas de tarefas em impressora térmica
- Automatizar impressão diária de tarefas

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
| **Tarefa** | Atividade a ser realizada (limpar cozinha, lavar roupa, etc.) |
| **Ocorrência** | Instância específica de uma tarefa em uma data |
| **Recorrência** | Padrão de repetição de uma tarefa (diária, semanal, etc.) |
| **Cardápio** | Plano de refeições para um período |
| **Prato** | Item do repertório de refeições da casa |
| **Impressão Automática** | Job agendado para imprimir tarefas automaticamente |
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
