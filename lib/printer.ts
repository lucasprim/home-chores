import net from 'net'
import iconv from 'iconv-lite'
import { markdownToEscPos } from './markdown-printer'

export type PrinterType = 'EPSON' | 'STAR' | 'TANCA' | 'DARUMA'

const PRINTER_PORT = 9100

// ESC/POS commands
export const ESC = '\x1B'
export const GS = '\x1D'
export const COMMANDS = {
  INIT: `${ESC}@`,
  // Set character code table to PC860 (Portuguese) - ESC t n where n=3
  SET_CHARSET_PORTUGUESE: `${ESC}t\x03`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_LEFT: `${ESC}a\x00`,
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  DOUBLE_HEIGHT_ON: `${GS}!\x10`,
  DOUBLE_HEIGHT_OFF: `${GS}!\x00`,
  CUT: `${GS}V\x00`,
  PARTIAL_CUT: `${GS}V\x01`,
  // Use ASCII-compatible characters for thermal printer
  LINE: '================================================',
  DASH_LINE: '------------------------------------------------',
  STAR_LINE: '************************************************',
}

export async function testPrinterConnection(ip: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    socket.setTimeout(3000)

    socket.on('connect', () => {
      socket.destroy()
      resolve(true)
    })

    socket.on('error', () => {
      socket.destroy()
      resolve(false)
    })

    socket.on('timeout', () => {
      socket.destroy()
      resolve(false)
    })

    socket.connect(PRINTER_PORT, ip)
  })
}

// Encode UTF-8 text to CP860 (Portuguese code page) for thermal printer
function encodeForPrinter(text: string): Buffer {
  return iconv.encode(text, 'CP860')
}

async function sendToPrinter(ip: string, data: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    socket.setTimeout(10000)

    socket.on('connect', () => {
      // Encode text to CP860 for Portuguese character support
      const encodedData = encodeForPrinter(data)
      socket.write(encodedData, (err) => {
        socket.destroy()
        if (err) reject(err)
        else resolve()
      })
    })

    socket.on('error', (err) => {
      socket.destroy()
      reject(err)
    })

    socket.on('timeout', () => {
      socket.destroy()
      reject(new Error('Timeout ao conectar com a impressora'))
    })

    socket.connect(PRINTER_PORT, ip)
  })
}

export async function printTestPage(ip: string, _type: PrinterType, houseName: string): Promise<void> {
  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR')
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const content = [
    COMMANDS.INIT,
    COMMANDS.SET_CHARSET_PORTUGUESE,
    COMMANDS.ALIGN_CENTER,
    COMMANDS.DOUBLE_HEIGHT_ON,
    COMMANDS.BOLD_ON,
    `${COMMANDS.LINE}\n`,
    `TESTE\n`,
    `${COMMANDS.LINE}\n`,
    COMMANDS.BOLD_OFF,
    COMMANDS.DOUBLE_HEIGHT_OFF,
    '\n',
    `${houseName}\n`,
    `${dateStr} ${timeStr}\n`,
    '\n',
    'Impressora OK!\n',
    '\n',
    `${COMMANDS.LINE}\n`,
    '\n\n\n',
    COMMANDS.CUT,
  ].join('')

  await sendToPrinter(ip, content)
}

export interface PrintTasksOptions {
  ip: string
  type: PrinterType
  houseName: string
  date: Date
  employees: {
    name: string
    role: string
    tasks: {
      title: string
      description?: string | null
    }[]
  }[]
}

export async function printDailyTasks(options: PrintTasksOptions): Promise<void> {
  const { ip, houseName, date, employees } = options
  const dateStr = date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const lines: string[] = [
    COMMANDS.INIT,
    COMMANDS.SET_CHARSET_PORTUGUESE,
    COMMANDS.ALIGN_CENTER,
    COMMANDS.DOUBLE_HEIGHT_ON,
    COMMANDS.BOLD_ON,
    `${houseName.toUpperCase()}\n`,
    COMMANDS.BOLD_OFF,
    COMMANDS.DOUBLE_HEIGHT_OFF,
    `${COMMANDS.LINE}\n`,
    '\n',
    COMMANDS.BOLD_ON,
    `TAREFAS - ${dateStr}\n`,
    COMMANDS.BOLD_OFF,
    '\n',
  ]

  let totalTasks = 0

  for (const employee of employees) {
    lines.push(`${COMMANDS.DASH_LINE}\n`)
    lines.push(COMMANDS.BOLD_ON)
    lines.push(`${employee.name.toUpperCase()}\n`)
    lines.push(COMMANDS.BOLD_OFF)
    lines.push(COMMANDS.ALIGN_LEFT)
    lines.push('\n')

    for (const task of employee.tasks) {
      lines.push(`[ ] ${task.title}\n`)
      if (task.description) {
        lines.push(`    ${task.description}\n`)
      }
      totalTasks++
    }

    lines.push('\n')
    lines.push(COMMANDS.ALIGN_CENTER)
  }

  lines.push(`${COMMANDS.DASH_LINE}\n`)
  lines.push(`${totalTasks} tarefas - Bom trabalho!\n`)
  lines.push(`${COMMANDS.LINE}\n`)
  lines.push('\n\n\n')
  lines.push(COMMANDS.CUT)

  await sendToPrinter(ip, lines.join(''))
}

export interface PrintMenuOptions {
  ip: string
  type: PrinterType
  houseName: string
  weekStart: Date
  days: {
    date: Date
    lunch?: string
    dinner?: string
  }[]
}

export async function printWeeklyMenu(options: PrintMenuOptions): Promise<void> {
  const { ip, houseName, weekStart, days } = options

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const periodStr = `${weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${weekEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`

  const lines: string[] = [
    COMMANDS.INIT,
    COMMANDS.SET_CHARSET_PORTUGUESE,
    COMMANDS.ALIGN_CENTER,
    COMMANDS.DOUBLE_HEIGHT_ON,
    COMMANDS.BOLD_ON,
    `${houseName.toUpperCase()}\n`,
    COMMANDS.BOLD_OFF,
    COMMANDS.DOUBLE_HEIGHT_OFF,
    `${COMMANDS.LINE}\n`,
    '\n',
    COMMANDS.BOLD_ON,
    `CARDAPIO DA SEMANA\n`,
    COMMANDS.BOLD_OFF,
    `${periodStr}\n`,
    '\n',
  ]

  const weekDays = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO']

  for (const day of days) {
    const dayName = weekDays[day.date.getDay()]
    const dayStr = day.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

    lines.push(`${COMMANDS.DASH_LINE}\n`)
    lines.push(COMMANDS.BOLD_ON)
    lines.push(`${dayName} ${dayStr}\n`)
    lines.push(COMMANDS.BOLD_OFF)
    lines.push(COMMANDS.ALIGN_LEFT)

    if (day.lunch) {
      lines.push(`Almoco: ${day.lunch}\n`)
    }
    if (day.dinner) {
      lines.push(`Jantar: ${day.dinner}\n`)
    }
    if (!day.lunch && !day.dinner) {
      lines.push(`(nao definido)\n`)
    }

    lines.push(COMMANDS.ALIGN_CENTER)
  }

  lines.push(`${COMMANDS.LINE}\n`)
  lines.push('\n\n\n')
  lines.push(COMMANDS.CUT)

  await sendToPrinter(ip, lines.join(''))
}

// ============================================
// MULTI-PAGE PRINTING WITH PARTIAL CUTS
// ============================================

export interface TaskItem {
  title: string
  description?: string | null
}

export interface SpecialTaskItem {
  title: string
  description?: string | null
  dueDate: Date
  category: string
  employee?: { name: string; role: string } | null
}

export type PrintPage =
  | { type: 'UNASSIGNED_TASKS'; tasks: TaskItem[] }
  | { type: 'EMPLOYEE_TASKS'; employee: { name: string; role: string }; tasks: TaskItem[] }
  | { type: 'MENU'; lunch?: string; dinner?: string }
  | { type: 'SPECIAL_TASK'; task: SpecialTaskItem }

export interface PrintMultiPageOptions {
  ip: string
  type: PrinterType
  houseName: string
  date: Date
  pages: PrintPage[]
  showNotesSection?: boolean
}

export function formatTasksPage(
  tasks: TaskItem[],
  header: string,
  houseName: string,
  date: Date,
  showNotesSection?: boolean
): string[] {
  const dateStr = date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const lines: string[] = [
    COMMANDS.INIT,
    COMMANDS.SET_CHARSET_PORTUGUESE,
    COMMANDS.ALIGN_CENTER,
    COMMANDS.DOUBLE_HEIGHT_ON,
    COMMANDS.BOLD_ON,
    `${houseName.toUpperCase()}\n`,
    COMMANDS.BOLD_OFF,
    COMMANDS.DOUBLE_HEIGHT_OFF,
    `${COMMANDS.LINE}\n`,
    '\n',
    COMMANDS.BOLD_ON,
    `${header}\n`,
    COMMANDS.BOLD_OFF,
    `${dateStr}\n`,
    '\n',
    COMMANDS.ALIGN_LEFT,
  ]

  for (const task of tasks) {
    lines.push(`[ ] ${task.title}\n`)
    if (task.description) {
      lines.push(`    ${task.description}\n`)
    }
  }

  lines.push('\n')
  lines.push(COMMANDS.ALIGN_CENTER)
  lines.push(`${tasks.length} tarefa${tasks.length !== 1 ? 's' : ''}\n`)

  if (showNotesSection) {
    lines.push(`${COMMANDS.DASH_LINE}\n`)
    lines.push(COMMANDS.BOLD_ON)
    lines.push('NOTAS / OBSERVACOES:\n')
    lines.push(COMMANDS.BOLD_OFF)
    lines.push(COMMANDS.ALIGN_LEFT)
    lines.push('\n')
    lines.push('________________________________________________\n')
    lines.push('\n')
    lines.push('________________________________________________\n')
    lines.push('\n')
    lines.push('________________________________________________\n')
    lines.push('\n')
    lines.push(COMMANDS.ALIGN_CENTER)
  }

  lines.push(`${COMMANDS.LINE}\n`)
  lines.push('\n\n\n')

  return lines
}

export function formatMenuPage(
  houseName: string,
  date: Date,
  lunch?: string,
  dinner?: string
): string[] {
  const dateStr = date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  })

  const lines: string[] = [
    COMMANDS.INIT,
    COMMANDS.SET_CHARSET_PORTUGUESE,
    COMMANDS.ALIGN_CENTER,
    COMMANDS.DOUBLE_HEIGHT_ON,
    COMMANDS.BOLD_ON,
    `${houseName.toUpperCase()}\n`,
    COMMANDS.BOLD_OFF,
    COMMANDS.DOUBLE_HEIGHT_OFF,
    `${COMMANDS.LINE}\n`,
    '\n',
    COMMANDS.BOLD_ON,
    'CARDAPIO DO DIA\n',
    COMMANDS.BOLD_OFF,
    `${dateStr}\n`,
    '\n',
    COMMANDS.ALIGN_LEFT,
  ]

  if (lunch) {
    lines.push(COMMANDS.BOLD_ON)
    lines.push('Almoco:\n')
    lines.push(COMMANDS.BOLD_OFF)
    lines.push(`  ${lunch}\n`)
    lines.push('\n')
  }

  if (dinner) {
    lines.push(COMMANDS.BOLD_ON)
    lines.push('Jantar:\n')
    lines.push(COMMANDS.BOLD_OFF)
    lines.push(`  ${dinner}\n`)
    lines.push('\n')
  }

  lines.push(COMMANDS.ALIGN_CENTER)
  lines.push(`${COMMANDS.LINE}\n`)
  lines.push('\n\n\n')

  return lines
}

export function formatSpecialTaskPage(
  houseName: string,
  task: SpecialTaskItem
): string[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(task.dueDate)
  dueDate.setHours(0, 0, 0, 0)
  const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const dueDateStr = dueDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  let daysLabel: string
  if (daysRemaining < 0) {
    daysLabel = `ATRASADA ${Math.abs(daysRemaining)} dia${Math.abs(daysRemaining) !== 1 ? 's' : ''}!`
  } else if (daysRemaining === 0) {
    daysLabel = 'VENCE HOJE!'
  } else if (daysRemaining === 1) {
    daysLabel = 'VENCE AMANHA!'
  } else {
    daysLabel = `${daysRemaining} dias restantes`
  }

  const lines: string[] = [
    COMMANDS.INIT,
    COMMANDS.SET_CHARSET_PORTUGUESE,
    COMMANDS.ALIGN_CENTER,
    `${COMMANDS.STAR_LINE}\n`,
    COMMANDS.DOUBLE_HEIGHT_ON,
    COMMANDS.BOLD_ON,
    'TAREFA ESPECIAL\n',
    COMMANDS.BOLD_OFF,
    COMMANDS.DOUBLE_HEIGHT_OFF,
    `${COMMANDS.STAR_LINE}\n`,
    '\n',
    COMMANDS.BOLD_ON,
    `${houseName.toUpperCase()}\n`,
    COMMANDS.BOLD_OFF,
    '\n',
    COMMANDS.DOUBLE_HEIGHT_ON,
    `[ ] ${task.title.toUpperCase()}\n`,
    COMMANDS.DOUBLE_HEIGHT_OFF,
    '\n',
    COMMANDS.ALIGN_LEFT,
  ]

  if (task.description) {
    lines.push(`    ${task.description}\n`)
    lines.push('\n')
  }

  lines.push(COMMANDS.ALIGN_CENTER)
  lines.push(COMMANDS.BOLD_ON)
  if (task.employee) {
    lines.push(`RESPONSAVEL: ${task.employee.name.toUpperCase()}\n`)
  } else {
    lines.push('RESPONSAVEL: NAO ATRIBUIDO\n')
  }
  lines.push(COMMANDS.BOLD_OFF)
  lines.push('\n')
  lines.push(COMMANDS.BOLD_ON)
  lines.push(`VENCE: ${dueDateStr}\n`)
  lines.push(`(${daysLabel})\n`)
  lines.push(COMMANDS.BOLD_OFF)
  lines.push('\n')
  lines.push(`${COMMANDS.STAR_LINE}\n`)
  lines.push('\n\n\n')

  return lines
}

export interface WeeklyMenuDay {
  date: Date
  lunch?: string
  dinner?: string
}

export function formatWeeklyMenuPage(
  houseName: string,
  weekStart: Date,
  days: WeeklyMenuDay[]
): string[] {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const periodStr = `${weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${weekEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`

  const lines: string[] = [
    COMMANDS.INIT,
    COMMANDS.SET_CHARSET_PORTUGUESE,
    COMMANDS.ALIGN_CENTER,
    COMMANDS.DOUBLE_HEIGHT_ON,
    COMMANDS.BOLD_ON,
    `${houseName.toUpperCase()}\n`,
    COMMANDS.BOLD_OFF,
    COMMANDS.DOUBLE_HEIGHT_OFF,
    `${COMMANDS.LINE}\n`,
    '\n',
    COMMANDS.BOLD_ON,
    `CARDAPIO DA SEMANA\n`,
    COMMANDS.BOLD_OFF,
    `${periodStr}\n`,
    '\n',
  ]

  const weekDays = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO']

  for (const day of days) {
    const dayName = weekDays[day.date.getDay()]
    const dayStr = day.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

    lines.push(`${COMMANDS.DASH_LINE}\n`)
    lines.push(COMMANDS.BOLD_ON)
    lines.push(`${dayName} ${dayStr}\n`)
    lines.push(COMMANDS.BOLD_OFF)
    lines.push(COMMANDS.ALIGN_LEFT)

    if (day.lunch) {
      lines.push(`Almoco: ${day.lunch}\n`)
    }
    if (day.dinner) {
      lines.push(`Jantar: ${day.dinner}\n`)
    }
    if (!day.lunch && !day.dinner) {
      lines.push(`(nao definido)\n`)
    }

    lines.push(COMMANDS.ALIGN_CENTER)
  }

  lines.push(`${COMMANDS.LINE}\n`)
  lines.push('\n\n\n')
  lines.push(COMMANDS.CUT)

  return lines
}

export interface FormatMultiPageOptions {
  houseName: string
  date: Date
  pages: PrintPage[]
  showNotesSection?: boolean
}

export function formatMultiPageDaily(options: FormatMultiPageOptions): string[] {
  const { houseName, date, pages, showNotesSection } = options

  const allLines: string[] = []
  const totalPages = pages.length

  for (let i = 0; i < totalPages; i++) {
    const page = pages[i]!
    const isLastPage = i === totalPages - 1

    switch (page.type) {
      case 'UNASSIGNED_TASKS':
        allLines.push(...formatTasksPage(page.tasks, 'TAREFAS GERAIS', houseName, date))
        break

      case 'EMPLOYEE_TASKS':
        allLines.push(
          ...formatTasksPage(
            page.tasks,
            page.employee.name.toUpperCase(),
            houseName,
            date,
            showNotesSection
          )
        )
        break

      case 'MENU':
        allLines.push(...formatMenuPage(houseName, date, page.lunch, page.dinner))
        break

      case 'SPECIAL_TASK':
        allLines.push(...formatSpecialTaskPage(houseName, page.task))
        break
    }

    // Add cut after each page
    if (isLastPage) {
      allLines.push(COMMANDS.CUT) // Full cut for last page
    } else {
      allLines.push(COMMANDS.PARTIAL_CUT) // Partial cut between pages
    }
  }

  return allLines
}

export async function printMultiPageDaily(options: PrintMultiPageOptions): Promise<void> {
  const { ip, houseName, date, pages, showNotesSection } = options

  const allLines: string[] = []
  const totalPages = pages.length

  for (let i = 0; i < totalPages; i++) {
    const page = pages[i]!
    const isLastPage = i === totalPages - 1

    switch (page.type) {
      case 'UNASSIGNED_TASKS':
        allLines.push(...formatTasksPage(page.tasks, 'TAREFAS GERAIS', houseName, date))
        break

      case 'EMPLOYEE_TASKS':
        allLines.push(
          ...formatTasksPage(
            page.tasks,
            page.employee.name.toUpperCase(),
            houseName,
            date,
            showNotesSection
          )
        )
        break

      case 'MENU':
        allLines.push(...formatMenuPage(houseName, date, page.lunch, page.dinner))
        break

      case 'SPECIAL_TASK':
        allLines.push(...formatSpecialTaskPage(houseName, page.task))
        break
    }

    // Add cut after each page
    if (isLastPage) {
      allLines.push(COMMANDS.CUT) // Full cut for last page
    } else {
      allLines.push(COMMANDS.PARTIAL_CUT) // Partial cut between pages
    }
  }

  await sendToPrinter(ip, allLines.join(''))
}

// ============================================
// CUSTOM MESSAGE PRINTING
// ============================================

export interface PrintCustomMessageOptions {
  ip: string
  type: PrinterType
  houseName: string
  title: string
  content: string
}

export function formatMessagePage(
  houseName: string,
  title: string,
  content: string
): string[] {
  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const timeStr = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const lines: string[] = [
    COMMANDS.INIT,
    COMMANDS.SET_CHARSET_PORTUGUESE,
    COMMANDS.ALIGN_CENTER,
    `${COMMANDS.LINE}\n`,
    COMMANDS.DOUBLE_HEIGHT_ON,
    COMMANDS.BOLD_ON,
    `${houseName.toUpperCase()}\n`,
    COMMANDS.BOLD_OFF,
    COMMANDS.DOUBLE_HEIGHT_OFF,
    `${COMMANDS.LINE}\n`,
    '\n',
    COMMANDS.BOLD_ON,
    `${title.toUpperCase()}\n`,
    COMMANDS.BOLD_OFF,
    `${dateStr} ${timeStr}\n`,
    '\n',
    `${COMMANDS.DASH_LINE}\n`,
    '\n',
    COMMANDS.ALIGN_LEFT,
  ]

  // Convert markdown content to ESC/POS
  const contentLines = markdownToEscPos(content)
  lines.push(...contentLines)

  lines.push('\n')
  lines.push(COMMANDS.ALIGN_CENTER)
  lines.push(`${COMMANDS.LINE}\n`)
  lines.push('\n\n\n')
  lines.push(COMMANDS.CUT)

  return lines
}

export async function printCustomMessage(options: PrintCustomMessageOptions): Promise<void> {
  const { ip, houseName, title, content } = options
  const lines = formatMessagePage(houseName, title, content)
  await sendToPrinter(ip, lines.join(''))
}
