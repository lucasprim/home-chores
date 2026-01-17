import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteParams = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { completed, notes } = body

    const existing = await prisma.taskOccurrence.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Ocorrência não encontrada' }, { status: 404 })
    }

    const occurrence = await prisma.taskOccurrence.update({
      where: { id },
      data: {
        ...(completed !== undefined && {
          completed,
          completedAt: completed ? new Date() : null,
        }),
        ...(notes !== undefined && { notes }),
      },
    })

    return NextResponse.json(occurrence)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar ocorrência' }, { status: 500 })
  }
}
