# Impressão - Integração com Impressora Térmica

## Visão Geral

Funcionalidade de impressão manual de tarefas e cardápios em impressora térmica ESC/POS.

## User Stories

### US-01: Imprimir tarefas do dia
**Como** usuário
**Quero** imprimir a lista de tarefas do dia
**Para** entregar aos funcionários

### US-02: Imprimir por funcionário
**Como** usuário
**Quero** imprimir tarefas de um funcionário específico
**Para** facilitar a distribuição

### US-03: Visualizar antes de imprimir
**Como** usuário
**Quero** ver um preview do que será impresso
**Para** confirmar antes de imprimir

### US-04: Imprimir cardápio semanal
**Como** usuário
**Quero** imprimir o cardápio da semana
**Para** fixar na cozinha

## Wireframes

### Tela de Impressão

```
┌────────────────────────────────────────────────────────┐
│  Imprimir                                              │
├────────────────────────────────────────────────────────┤
│                                                        │
│  O que imprimir?                                       │
│  ┌──────────────────────────────────────────────────┐ │
│  │ ● Tarefas do dia                                  │ │
│  │ ○ Cardápio semanal                               │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Data                                                  │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 16/01/2024                                   [📅] │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Funcionário                                           │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Todos                                         ▼  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  [Ver preview]                                         │
│                                                        │
├────────────────────────────────────────────────────────┤
│  Preview                                               │
│  ┌──────────────────────────────────────────────────┐ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │      ═══════ CASA DA PRAIA ═══════         │ │ │
│  │  │                                              │ │ │
│  │  │      TAREFAS - 16/01/2024                   │ │ │
│  │  │                                              │ │ │
│  │  │      --- MARIA ---                          │ │ │
│  │  │      [ ] Limpar cozinha                     │ │ │
│  │  │      [ ] Lavar roupa                        │ │ │
│  │  │      [ ] Passar roupa                       │ │ │
│  │  │                                              │ │ │
│  │  │      --- JOANA ---                          │ │ │
│  │  │      [ ] Preparar almoço                    │ │ │
│  │  │      [ ] Preparar jantar                    │ │ │
│  │  │                                              │ │ │
│  │  │      ═══════════════════════════════        │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│                                          [Imprimir]    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Preview - Tarefas por Funcionário

```
┌─────────────────────────────────────────┐
│                                         │
│      ═══════ CASA DA PRAIA ═══════      │
│                                         │
│      TAREFAS - 16/01/2024               │
│      Maria (Faxineira)                  │
│                                         │
│      ─────────────────────────────      │
│                                         │
│      [ ] Limpar cozinha                 │
│          Limpar pia, fogão e bancadas   │
│                                         │
│      [ ] Lavar banheiro                 │
│          Limpar box, vaso e pia         │
│                                         │
│      [ ] Passar roupa                   │
│          Roupas da semana               │
│                                         │
│      [ ] Organizar quartos              │
│          Arrumar camas, organizar       │
│                                         │
│      [ ] Limpar sala                    │
│          Aspirar e passar pano          │
│                                         │
│      ─────────────────────────────      │
│      5 tarefas • Bom trabalho!          │
│      ═════════════════════════════      │
│                                         │
└─────────────────────────────────────────┘
```

### Preview - Cardápio Semanal

```
┌─────────────────────────────────────────┐
│                                         │
│      ═══════ CASA DA PRAIA ═══════      │
│                                         │
│      CARDÁPIO DA SEMANA                 │
│      15/01 a 21/01/2024                 │
│                                         │
│      ─────────────────────────────      │
│                                         │
│      SEGUNDA 15/01                      │
│      Almoço: Arroz com feijão           │
│      Jantar: Sopa de legumes            │
│                                         │
│      TERÇA 16/01                        │
│      Almoço: Frango grelhado            │
│      Jantar: Omelete                    │
│                                         │
│      QUARTA 17/01                       │
│      Almoço: Macarrão à bolonhesa       │
│      Jantar: Salada completa            │
│                                         │
│      ...                                │
│                                         │
│      ═════════════════════════════      │
│                                         │
└─────────────────────────────────────────┘
```

## Componentes

### Página de Impressão

```tsx
interface PrintPageProps {
  employees: Employee[]
}
```

### Seletor de Tipo

```tsx
interface PrintTypeSelectorProps {
  value: PrintType
  onChange: (type: PrintType) => void
}

type PrintType = 'DAILY_TASKS' | 'SINGLE_TASK' | 'WEEKLY_MENU'
```

### Preview

```tsx
interface PrintPreviewProps {
  lines: PrintLine[]
}

interface PrintLine {
  type: 'title' | 'subtitle' | 'text' | 'item' | 'separator' | 'empty'
  text?: string
  bold?: boolean
  align?: 'left' | 'center' | 'right'
}
```

## Formato de Impressão

### Configurações da Impressora

```typescript
const printerConfig = {
  type: 'EPSON',
  interface: 'tcp://192.168.1.230:9100',
  characterSet: 'BRAZIL',
  width: 48, // caracteres por linha (80mm)
}
```

### Comandos ESC/POS

```typescript
import { ThermalPrinter, PrinterTypes } from 'node-thermal-printer'

async function printDailyTasks(date: Date, employeeId?: string) {
  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: `tcp://${settings.printer_ip}:9100`,
    characterSet: 'BRAZIL',
  })

  // Header
  printer.alignCenter()
  printer.setTextDoubleHeight()
  printer.println(settings.house_name.toUpperCase())
  printer.setTextNormal()
  printer.drawLine()

  // Título
  printer.bold(true)
  printer.println(`TAREFAS - ${formatDate(date)}`)
  printer.bold(false)

  // Tarefas por funcionário
  for (const employee of employees) {
    printer.newLine()
    printer.println(`--- ${employee.name.toUpperCase()} ---`)
    printer.alignLeft()

    for (const task of employee.tasks) {
      printer.println(`[ ] ${task.title}`)
      if (task.description) {
        printer.println(`    ${task.description}`)
      }
    }
  }

  // Footer
  printer.alignCenter()
  printer.drawLine()
  printer.println(`${totalTasks} tarefas • Bom trabalho!`)
  printer.drawLine()

  // Cortar papel
  printer.cut()

  // Enviar para impressora
  await printer.execute()
}
```

## Tipos de Impressão

### DAILY_TASKS - Tarefas do Dia

**Parâmetros:**
- `date`: Data das tarefas
- `employeeId`: Opcional, filtra por funcionário

**Conteúdo:**
- Header com nome da casa
- Data formatada
- Tarefas agrupadas por funcionário
- Checkbox [ ] para cada tarefa
- Descrição da tarefa (se houver)
- Contagem total

### SINGLE_TASK - Ticket Individual

**Parâmetros:**
- `taskId`: ID da tarefa
- `date`: Data da ocorrência

**Conteúdo:**
- Header com nome da casa
- Nome do funcionário
- Título da tarefa em destaque
- Descrição completa
- Data e hora de impressão

### WEEKLY_MENU - Cardápio Semanal

**Parâmetros:**
- `weekStart`: Data inicial da semana

**Conteúdo:**
- Header com nome da casa
- Período da semana
- Cada dia com almoço e jantar
- Nome do prato
- Quem vai preparar (se definido)

## Fluxo de Impressão

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Selecionar │────▶│   Carregar  │────▶│   Exibir    │
│   Opções    │     │   Preview   │     │   Preview   │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                          ┌────────────────────┘
                          ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Confirmar  │────▶│   Enviar    │────▶│   Exibir    │
│   Impressão │     │ Impressora  │     │  Resultado  │
└─────────────┘     └─────────────┘     └─────────────┘
```

## API Calls

### Carregar preview

```typescript
// GET /api/print/preview?type=DAILY_TASKS&date=2024-01-16&employeeId=xxx

const loadPreview = async (type: PrintType, date: string, employeeId?: string) => {
  const params = new URLSearchParams({ type, date })
  if (employeeId) params.append('employeeId', employeeId)

  const response = await fetch(`/api/print/preview?${params}`)
  return response.json()
}
```

### Executar impressão

```typescript
// POST /api/print

const print = async (data: PrintRequest) => {
  const response = await fetch('/api/print', {
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

interface PrintRequest {
  type: PrintType
  date: string
  employeeId?: string
  taskId?: string
}
```

## Estados

### Idle
- Formulário disponível
- Botões habilitados

### Loading Preview
- Skeleton no preview
- Formulário desabilitado

### Preview Ready
- Preview exibido
- Botão "Imprimir" habilitado

### Printing
- Spinner no botão
- "Imprimindo..."
- Formulário desabilitado

### Success
- Toast de sucesso
- "Impresso com sucesso!"
- Reset do formulário

### Error
- Toast de erro
- Mensagem do erro
- Botão "Tentar novamente"

## Tratamento de Erros

### Impressora offline
```typescript
{
  error: {
    code: 'PRINTER_OFFLINE',
    message: 'Impressora não está respondendo. Verifique a conexão.'
  }
}
```

### Sem tarefas
```typescript
{
  error: {
    code: 'NO_TASKS',
    message: 'Não há tarefas para imprimir nesta data.'
  }
}
```

### Erro de conexão
```typescript
{
  error: {
    code: 'CONNECTION_ERROR',
    message: 'Erro ao conectar com a impressora. Verifique o IP.'
  }
}
```

## Caracteres Especiais

Mapeamento para impressora térmica:

```typescript
const charMap: Record<string, string> = {
  'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a',
  'é': 'e', 'ê': 'e',
  'í': 'i',
  'ó': 'o', 'ô': 'o', 'õ': 'o',
  'ú': 'u', 'ü': 'u',
  'ç': 'c',
}

// Nota: Com characterSet: 'BRAZIL', acentos devem funcionar
// Fallback apenas se necessário
```

## Largura do Papel

Para papel de 80mm:
- Largura útil: ~72mm
- Caracteres por linha: 48 (fonte normal)
- Caracteres por linha: 24 (fonte dupla)

```typescript
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

function wrapText(text: string, maxLength: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxLength) {
      currentLine = (currentLine + ' ' + word).trim()
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }

  if (currentLine) lines.push(currentLine)
  return lines
}
```

## Integração com Botão Rápido

O dashboard "Hoje" tem um botão de impressão rápida:

```typescript
// Imprimir todas as tarefas do dia atual
const quickPrint = async () => {
  await print({
    type: 'DAILY_TASKS',
    date: format(new Date(), 'yyyy-MM-dd')
  })
}
```

## Testes

### Unitários
- Formatação de texto
- Truncamento e wrap
- Geração de preview

### Integração
- API de preview
- API de impressão (mock)
- Tratamento de erros

### E2E
- Fluxo completo com impressora real
- Seleção de opções
- Verificação visual da impressão
