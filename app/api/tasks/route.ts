import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Category } from '@prisma/client'
import { RRule } from 'rrule'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const employeeId = searchParams.get('employeeId')
    const category = searchParams.get('category')

    const where: {
      active?: boolean
      employeeId?: string | null
      category?: Category
    } = {}

    if (active === 'true') where.active = true
    if (active === 'false') where.active = false
    if (employeeId) where.employeeId = employeeId
    if (category && Object.values(Category).includes(category as Category)) {
      where.category = category as Category
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        employee: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { title: 'asc' },
    })

    return NextResponse.json(tasks)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar tarefas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, category, employeeId, rrule } = body

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
      return NextResponse.json({ error: 'Recorrência é obrigatória' }, { status: 400 })
    }

    // Validate rrule
    try {
      RRule.fromString(rrule)
    } catch {
      return NextResponse.json({ error: 'Recorrência inválida' }, { status: 400 })
    }

    if (employeeId) {
      const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
      if (!employee) {
        return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 400 })
      }
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        category,
        employeeId: employeeId || null,
        rrule,
      },
      include: {
        employee: {
          select: { id: true, name: true, role: true },
        },
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar tarefa' }, { status: 500 })
  }
}
