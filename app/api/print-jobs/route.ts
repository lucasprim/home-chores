import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PrintType } from '@prisma/client'
import { rescheduleJob } from '@/lib/scheduler'

export async function GET() {
  try {
    const jobs = await prisma.printJob.findMany({
      include: {
        employee: {
          select: { id: true, name: true },
        },
        logs: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(jobs)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar jobs de impressão' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, cronExpression, type, employeeId, enabled } = body

    if (!name || typeof name !== 'string' || name.trim().length < 3) {
      return NextResponse.json({ error: 'Nome deve ter pelo menos 3 caracteres' }, { status: 400 })
    }

    if (!cronExpression || typeof cronExpression !== 'string') {
      return NextResponse.json({ error: 'Expressão cron é obrigatória' }, { status: 400 })
    }

    // Validate cron expression format (basic validation)
    const cronParts = cronExpression.trim().split(/\s+/)
    if (cronParts.length !== 5) {
      return NextResponse.json({ error: 'Expressão cron inválida' }, { status: 400 })
    }

    if (!type || !Object.values(PrintType).includes(type)) {
      return NextResponse.json({ error: 'Tipo de impressão inválido' }, { status: 400 })
    }

    if (employeeId) {
      const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
      if (!employee) {
        return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 400 })
      }
    }

    const job = await prisma.printJob.create({
      data: {
        name: name.trim(),
        cronExpression: cronExpression.trim(),
        type,
        employeeId: employeeId || null,
        enabled: enabled !== false,
      },
      include: {
        employee: {
          select: { id: true, name: true },
        },
      },
    })

    // Sync with scheduler
    if (job.enabled) {
      await rescheduleJob(job.id)
    }

    return NextResponse.json(job, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar job de impressão' }, { status: 500 })
  }
}
