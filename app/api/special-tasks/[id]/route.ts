import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Category } from '@prisma/client'
import { RRule } from 'rrule'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const specialTask = await prisma.specialTask.findUnique({
      where: { id },
      include: {
        employee: {
          select: { id: true, name: true, role: true },
        },
      },
    })

    if (!specialTask) {
      return NextResponse.json({ error: 'Tarefa especial não encontrada' }, { status: 404 })
    }

    return NextResponse.json(specialTask)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar tarefa especial' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, description, category, employeeId, rrule, dueDays, active } = body

    const existing = await prisma.specialTask.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Tarefa especial não encontrada' }, { status: 404 })
    }

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 3) {
        return NextResponse.json({ error: 'Título deve ter pelo menos 3 caracteres' }, { status: 400 })
      }
      if (title.length > 100) {
        return NextResponse.json({ error: 'Título deve ter no máximo 100 caracteres' }, { status: 400 })
      }
    }

    if (category !== undefined && !Object.values(Category).includes(category)) {
      return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 })
    }

    if (rrule !== undefined) {
      try {
        RRule.fromString(rrule)
      } catch {
        return NextResponse.json({ error: 'Regra de recorrência inválida' }, { status: 400 })
      }
    }

    if (dueDays !== undefined) {
      const parsedDueDays = parseInt(dueDays)
      if (isNaN(parsedDueDays) || parsedDueDays < 1 || parsedDueDays > 365) {
        return NextResponse.json({ error: 'Prazo deve ser entre 1 e 365 dias' }, { status: 400 })
      }
    }

    if (employeeId !== undefined && employeeId !== null) {
      const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
      if (!employee) {
        return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 400 })
      }
    }

    const dataUpdates: Record<string, unknown> = {}

    if (title !== undefined) dataUpdates.title = title.trim()
    if (description !== undefined) dataUpdates.description = description?.trim() || null
    if (category !== undefined) dataUpdates.category = category
    if (employeeId !== undefined) dataUpdates.employeeId = employeeId || null
    if (rrule !== undefined) dataUpdates.rrule = rrule
    if (dueDays !== undefined) dataUpdates.dueDays = parseInt(dueDays)
    if (active !== undefined) dataUpdates.active = active

    const specialTask = await prisma.specialTask.update({
      where: { id },
      data: dataUpdates,
      include: {
        employee: {
          select: { id: true, name: true, role: true },
        },
      },
    })

    return NextResponse.json(specialTask)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar tarefa especial' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await prisma.specialTask.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Tarefa especial não encontrada' }, { status: 404 })
    }

    await prisma.specialTask.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir tarefa especial' }, { status: 500 })
  }
}
