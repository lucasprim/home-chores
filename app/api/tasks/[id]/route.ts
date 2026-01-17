import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Category } from '@prisma/client'
import { RRule } from 'rrule'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        employee: {
          select: { id: true, name: true, role: true },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar tarefa' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, description, category, employeeId, rrule, active } = body

    const existing = await prisma.task.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
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
        return NextResponse.json({ error: 'Recorrência inválida' }, { status: 400 })
      }
    }

    if (employeeId !== undefined && employeeId !== null) {
      const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
      if (!employee) {
        return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 400 })
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(category !== undefined && { category }),
        ...(employeeId !== undefined && { employeeId: employeeId || null }),
        ...(rrule !== undefined && { rrule }),
        ...(active !== undefined && { active }),
      },
      include: {
        employee: {
          select: { id: true, name: true, role: true },
        },
      },
    })

    return NextResponse.json(task)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar tarefa' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await prisma.task.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
    }

    // Soft delete - just deactivate
    await prisma.task.update({
      where: { id },
      data: { active: false },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir tarefa' }, { status: 500 })
  }
}
