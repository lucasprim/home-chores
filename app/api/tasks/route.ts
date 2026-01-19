import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Category, TaskType, Prisma } from '@prisma/client'
import { RRule } from 'rrule'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as TaskType | null
    const active = searchParams.get('active')
    const employeeId = searchParams.get('employeeId')
    const category = searchParams.get('category')
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const includePrinted = searchParams.get('includePrinted') === 'true'

    const where: Prisma.TaskWhereInput = {}

    // Type filter
    if (type && Object.values(TaskType).includes(type)) {
      where.taskType = type
    }

    // Active filter
    if (active === 'true') where.active = true
    if (active === 'false') where.active = false
    if (!includeInactive && active === null) where.active = true

    // Employee filter
    if (employeeId) where.employeeId = employeeId

    // Category filter
    if (category && Object.values(Category).includes(category as Category)) {
      where.category = category as Category
    }

    // For ONE_OFF tasks, filter by printedAt unless includePrinted
    if (type === TaskType.ONE_OFF && !includePrinted) {
      where.printedAt = null
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        employee: {
          select: { id: true, name: true, role: true, workDays: true },
        },
      },
      orderBy: [
        { active: 'desc' },
        { taskType: 'asc' },
        { title: 'asc' },
      ],
    })

    return NextResponse.json(tasks)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar tarefas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, category, employeeId, taskType, rrule, dueDays, startDate } = body

    // Default to RECURRING if not specified
    const type = (taskType && Object.values(TaskType).includes(taskType))
      ? taskType as TaskType
      : TaskType.RECURRING

    // Title validation
    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return NextResponse.json({ error: 'Título deve ter pelo menos 3 caracteres' }, { status: 400 })
    }

    if (title.length > 100) {
      return NextResponse.json({ error: 'Título deve ter no máximo 100 caracteres' }, { status: 400 })
    }

    // Category validation
    if (!category || !Object.values(Category).includes(category)) {
      return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 })
    }

    // Type-specific validation
    let validatedRrule: string | null = null
    let validatedDueDays: number | null = null
    let validatedStartDate: Date | null = null

    // Validate startDate (for RECURRING and SPECIAL tasks)
    if (startDate && (type === TaskType.RECURRING || type === TaskType.SPECIAL)) {
      const parsedStartDate = new Date(startDate)
      if (isNaN(parsedStartDate.getTime())) {
        return NextResponse.json({ error: 'Data de início inválida' }, { status: 400 })
      }
      validatedStartDate = parsedStartDate
    }

    if (type === TaskType.RECURRING || type === TaskType.SPECIAL) {
      // RECURRING and SPECIAL require rrule
      if (!rrule || typeof rrule !== 'string') {
        return NextResponse.json({ error: 'Recorrência é obrigatória para tarefas recorrentes e especiais' }, { status: 400 })
      }

      try {
        RRule.fromString(rrule)
        validatedRrule = rrule
      } catch {
        return NextResponse.json({ error: 'Recorrência inválida' }, { status: 400 })
      }
    }

    if (type === TaskType.SPECIAL || type === TaskType.ONE_OFF) {
      // SPECIAL and ONE_OFF require dueDays
      const parsedDueDays = dueDays !== undefined ? parseInt(dueDays) : 7
      if (isNaN(parsedDueDays) || parsedDueDays < 1 || parsedDueDays > 365) {
        return NextResponse.json({ error: 'Prazo deve ser entre 1 e 365 dias' }, { status: 400 })
      }
      validatedDueDays = parsedDueDays
    }

    // Employee validation
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
        taskType: type,
        rrule: validatedRrule,
        dueDays: validatedDueDays,
        printedAt: null, // Always null on creation
        startDate: validatedStartDate,
      },
      include: {
        employee: {
          select: { id: true, name: true, role: true, workDays: true },
        },
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar tarefa' }, { status: 500 })
  }
}
