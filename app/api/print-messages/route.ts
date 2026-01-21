import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const messages = await prisma.printMessage.findMany({
      where: { active: true },
      orderBy: [{ lastUsedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    })
    return NextResponse.json(messages)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar mensagens' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content } = body

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ error: 'Titulo e obrigatorio' }, { status: 400 })
    }

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json({ error: 'Conteudo e obrigatorio' }, { status: 400 })
    }

    if (title.length > 100) {
      return NextResponse.json({ error: 'Titulo deve ter no maximo 100 caracteres' }, { status: 400 })
    }

    const message = await prisma.printMessage.create({
      data: {
        title: title.trim(),
        content: content.trim(),
      },
    })

    return NextResponse.json(message, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar mensagem' }, { status: 500 })
  }
}
