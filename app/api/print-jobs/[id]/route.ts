import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PrintType } from '@prisma/client'
import { rescheduleJob, unscheduleJob } from '@/lib/scheduler'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const job = await prisma.printJob.findUnique({
      where: { id },
      include: {
        employee: {
          select: { id: true, name: true },
        },
        logs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 })
    }

    return NextResponse.json(job)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar job' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, cronExpression, type, employeeId, enabled } = body

    const existing = await prisma.printJob.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 })
    }

    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 3)) {
      return NextResponse.json({ error: 'Nome deve ter pelo menos 3 caracteres' }, { status: 400 })
    }

    if (cronExpression !== undefined) {
      const cronParts = cronExpression.trim().split(/\s+/)
      if (cronParts.length !== 5) {
        return NextResponse.json({ error: 'Expressão cron inválida' }, { status: 400 })
      }
    }

    if (type !== undefined && !Object.values(PrintType).includes(type)) {
      return NextResponse.json({ error: 'Tipo de impressão inválido' }, { status: 400 })
    }

    if (employeeId !== undefined && employeeId !== null) {
      const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
      if (!employee) {
        return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 400 })
      }
    }

    const job = await prisma.printJob.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(cronExpression !== undefined && { cronExpression: cronExpression.trim() }),
        ...(type !== undefined && { type }),
        ...(employeeId !== undefined && { employeeId: employeeId || null }),
        ...(enabled !== undefined && { enabled }),
      },
      include: {
        employee: {
          select: { id: true, name: true },
        },
      },
    })

    // Sync with scheduler
    await rescheduleJob(job.id)

    return NextResponse.json(job)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar job' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await prisma.printJob.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 })
    }

    // Unschedule before deleting
    unscheduleJob(id)

    await prisma.printJob.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir job' }, { status: 500 })
  }
}
