import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DEFAULT_SETTINGS = {
  house_name: 'Minha Casa',
  printer_ip: '192.168.1.230',
  printer_type: 'EPSON',
  default_print_time: '07:00',
}

type SettingsKey = keyof typeof DEFAULT_SETTINGS

export async function GET() {
  try {
    const settingsRecords = await prisma.settings.findMany()

    const settings: Record<string, string> = { ...DEFAULT_SETTINGS }
    for (const record of settingsRecords) {
      if (record.key !== 'app_pin') {
        settings[record.key] = record.value
      }
    }

    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar configurações' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const allowedKeys: SettingsKey[] = ['house_name', 'printer_ip', 'printer_type', 'default_print_time']

    const updates: { key: string; value: string }[] = []

    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        const value = String(body[key])

        if (key === 'house_name' && (!value || value.length > 50)) {
          return NextResponse.json({ error: 'Nome da casa inválido' }, { status: 400 })
        }

        if (key === 'printer_ip' && !/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) {
          return NextResponse.json({ error: 'IP inválido' }, { status: 400 })
        }

        if (key === 'printer_type' && !['EPSON', 'STAR', 'TANCA', 'DARUMA'].includes(value)) {
          return NextResponse.json({ error: 'Tipo de impressora inválido' }, { status: 400 })
        }

        if (key === 'default_print_time' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
          return NextResponse.json({ error: 'Horário inválido' }, { status: 400 })
        }

        updates.push({ key, value })
      }
    }

    for (const { key, value } of updates) {
      await prisma.settings.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 })
  }
}
