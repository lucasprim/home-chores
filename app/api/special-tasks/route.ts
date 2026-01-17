import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Category } from '@prisma/client'
import { RRule } from 'rrule'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where: {
      employeeId?: string | null
      active?: boolean
    } = {}

    if (employeeId) where.employeeId = employeeId
    if (!includeInactive) where.active = true

    const specialTasks = await prisma.specialTask.findMany({
      where,
      include: {
        employee: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: [{ active: 'desc' }, { title: 'asc' }],
    })

    return NextResponse.json(specialTasks)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar tarefas especiais' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, category, employeeId, rrule, dueDays } = body

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return NextResponse.json({ error: 'Título deve ter pelo menos 3 caracteres' }, { status: 400 })
    }

    if (title.length > 100) {
      return NextResponse.json({ error: 'Título deve ter no máximo 100 caracteres' }, { status: 400 })
    }

    if (!category || !Object.values(Category).includes(category)) {
      return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 })
    }

    if (!rrule || typeof rrule !== 'string') {
      return NextResponse.json({ error: 'Regra de recorrência é obrigatória' }, { status: 400 })
    }

    // Validate rrule
    try {
      RRule.fromString(rrule)
    } catch {
      return NextResponse.json({ error: 'Regra de recorrência inválida' }, { status: 400 })
    }

    const parsedDueDays = dueDays !== undefined ? parseInt(dueDays) : 7
    if (isNaN(parsedDueDays) || parsedDueDays < 1 || parsedDueDays > 365) {
      return NextResponse.json({ error: 'Prazo deve ser entre 1 e 365 dias' }, { status: 400 })
    }

    if (employeeId) {
      const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
      if (!employee) {
        return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 400 })
      }
    }

    const specialTask = await prisma.specialTask.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        category,
        rrule,
        dueDays: parsedDueDays,
        employeeId: employeeId || null,
      },
      include: {
        employee: {
          select: { id: true, name: true, role: true },
        },
      },
    })

    return NextResponse.json(specialTask, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar tarefa especial' }, { status: 500 })
  }
}
