import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(employees)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar funcionários' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, role, workDays } = body

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    if (!role || !Object.values(Role).includes(role)) {
      return NextResponse.json({ error: 'Função inválida' }, { status: 400 })
    }

    if (!Array.isArray(workDays) || workDays.some((d) => typeof d !== 'number' || d < 0 || d > 6)) {
      return NextResponse.json({ error: 'Dias de trabalho inválidos' }, { status: 400 })
    }

    const employee = await prisma.employee.create({
      data: {
        name: name.trim(),
        role,
        workDays,
      },
    })

    return NextResponse.json(employee, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar funcionário' }, { status: 500 })
  }
}
