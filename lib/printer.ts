import net from 'net'

export type PrinterType = 'EPSON' | 'STAR' | 'TANCA' | 'DARUMA'

const PRINTER_PORT = 9100

// ESC/POS commands
const ESC = '\x1B'
const GS = '\x1D'
const COMMANDS = {
  INIT: `${ESC}@`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_LEFT: `${ESC}a\x00`,
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  DOUBLE_HEIGHT_ON: `${GS}!\x10`,
  DOUBLE_HEIGHT_OFF: `${GS}!\x00`,
  CUT: `${GS}V\x00`,
  LINE: '════════════════════════════════════════════════',
  DASH_LINE: '────────────────────────────────────────────────',
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

async function sendToPrinter(ip: string, data: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    socket.setTimeout(10000)

    socket.on('connect', () => {
      socket.write(data, 'binary', (err) => {
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
