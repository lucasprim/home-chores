import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const message = await prisma.printMessage.findUnique({
      where: { id },
    })

    if (!message || !message.active) {
      return NextResponse.json({ error: 'Mensagem nao encontrada' }, { status: 404 })
    }

    return NextResponse.json(message)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar mensagem' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, content, lastUsedAt } = body

    const existing = await prisma.printMessage.findUnique({ where: { id } })
    if (!existing || !existing.active) {
      return NextResponse.json({ error: 'Mensagem nao encontrada' }, { status: 404 })
    }

    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
      return NextResponse.json({ error: 'Titulo invalido' }, { status: 400 })
    }

    if (title !== undefined && title.length > 100) {
      return NextResponse.json({ error: 'Titulo deve ter no maximo 100 caracteres' }, { status: 400 })
    }

    if (content !== undefined && (typeof content !== 'string' || content.trim() === '')) {
      return NextResponse.json({ error: 'Conteudo invalido' }, { status: 400 })
    }

    const message = await prisma.printMessage.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(content !== undefined && { content: content.trim() }),
        ...(lastUsedAt !== undefined && { lastUsedAt: new Date(lastUsedAt) }),
      },
    })

    return NextResponse.json(message)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar mensagem' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await prisma.printMessage.findUnique({ where: { id } })
    if (!existing || !existing.active) {
      return NextResponse.json({ error: 'Mensagem nao encontrada' }, { status: 404 })
    }

    // Soft delete
    await prisma.printMessage.update({
      where: { id },
      data: { active: false },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir mensagem' }, { status: 500 })
  }
}
