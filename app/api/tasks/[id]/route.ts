import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Category, TaskType } from '@prisma/client'
import { RRule } from 'rrule'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        employee: {
          select: { id: true, name: true, role: true, workDays: true },
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
    const { title, description, category, employeeId, taskType, rrule, dueDays, active, resetPrinted, startDate } = body

    const existing = await prisma.task.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
    }

    // Determine effective task type (use new one if provided, else keep existing)
    const effectiveType = (taskType && Object.values(TaskType).includes(taskType))
      ? taskType as TaskType
      : existing.taskType

    // Title validation
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 3) {
        return NextResponse.json({ error: 'Título deve ter pelo menos 3 caracteres' }, { status: 400 })
      }
      if (title.length > 100) {
        return NextResponse.json({ error: 'Título deve ter no máximo 100 caracteres' }, { status: 400 })
      }
    }

    // Category validation
    if (category !== undefined && !Object.values(Category).includes(category)) {
      return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 })
    }

    // Rrule validation (for RECURRING and SPECIAL)
    if (rrule !== undefined) {
      if (effectiveType === TaskType.ONE_OFF) {
        // ONE_OFF tasks should not have rrule
        return NextResponse.json({ error: 'Tarefas avulsas não podem ter recorrência' }, { status: 400 })
      }
      try {
        RRule.fromString(rrule)
      } catch {
        return NextResponse.json({ error: 'Recorrência inválida' }, { status: 400 })
      }
    }

    // DueDays validation (for SPECIAL and ONE_OFF) - 0 means same day
    if (dueDays !== undefined && dueDays !== null && dueDays !== '') {
      const parsedDueDays = parseInt(dueDays)
      if (isNaN(parsedDueDays) || parsedDueDays < 0 || parsedDueDays > 365) {
        return NextResponse.json({ error: 'Prazo deve ser entre 0 e 365 dias' }, { status: 400 })
      }
    }

    // Employee validation
    if (employeeId !== undefined && employeeId !== null) {
      const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
      if (!employee) {
        return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 400 })
      }
    }

    // startDate validation (for RECURRING and SPECIAL tasks)
    if (startDate !== undefined) {
      if (effectiveType === TaskType.ONE_OFF) {
        return NextResponse.json({ error: 'Tarefas avulsas não podem ter data de início' }, { status: 400 })
      }
      if (startDate !== null) {
        const parsedStartDate = new Date(startDate)
        if (isNaN(parsedStartDate.getTime())) {
          return NextResponse.json({ error: 'Data de início inválida' }, { status: 400 })
        }
      }
    }

    // Build update data
    const dataUpdates: Record<string, unknown> = {}

    if (title !== undefined) dataUpdates.title = title.trim()
    if (description !== undefined) dataUpdates.description = description?.trim() || null
    if (category !== undefined) dataUpdates.category = category
    if (employeeId !== undefined) dataUpdates.employeeId = employeeId || null
    if (taskType !== undefined && Object.values(TaskType).includes(taskType)) {
      dataUpdates.taskType = taskType
    }
    if (rrule !== undefined) dataUpdates.rrule = rrule
    if (dueDays !== undefined) dataUpdates.dueDays = parseInt(dueDays)
    if (active !== undefined) dataUpdates.active = active
    if (startDate !== undefined) dataUpdates.startDate = startDate ? new Date(startDate) : null

    // Reset printed state for ONE_OFF tasks (for re-printing)
    if (resetPrinted === true && effectiveType === TaskType.ONE_OFF) {
      dataUpdates.printedAt = null
      dataUpdates.active = true
    }

    const task = await prisma.task.update({
      where: { id },
      data: dataUpdates,
      include: {
        employee: {
          select: { id: true, name: true, role: true, workDays: true },
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

    // Soft delete - just deactivate (consistent across all task types)
    await prisma.task.update({
      where: { id },
      data: { active: false },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir tarefa' }, { status: 500 })
  }
}
