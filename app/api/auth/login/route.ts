import { NextRequest, NextResponse } from 'next/server'
import { verifyPin, createSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json()

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json({ error: 'PIN obrigatório' }, { status: 400 })
    }

    const valid = await verifyPin(pin)

    if (!valid) {
      return NextResponse.json({ error: 'PIN incorreto' }, { status: 401 })
    }

    await createSession()
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
