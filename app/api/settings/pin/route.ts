import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest) {
  try {
    const { currentPin, newPin } = await request.json()

    if (!currentPin || !newPin) {
      return NextResponse.json({ error: 'PIN atual e novo são obrigatórios' }, { status: 400 })
    }

    if (!/^\d{4,8}$/.test(newPin)) {
      return NextResponse.json({ error: 'Novo PIN deve ter entre 4 e 8 dígitos' }, { status: 400 })
    }

    // Get current PIN from database or use default
    const pinRecord = await prisma.settings.findUnique({ where: { key: 'app_pin' } })
    const storedPin = pinRecord?.value ?? process.env.APP_PIN ?? '1234'

    if (currentPin !== storedPin) {
      return NextResponse.json({ error: 'PIN atual incorreto' }, { status: 401 })
    }

    await prisma.settings.upsert({
      where: { key: 'app_pin' },
      update: { value: newPin },
      create: { key: 'app_pin', value: newPin },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao alterar PIN' }, { status: 500 })
  }
}
