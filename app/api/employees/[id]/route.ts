import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const employee = await prisma.employee.findUnique({
      where: { id },
    })

    if (!employee) {
      return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })
    }

    return NextResponse.json(employee)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar funcionário' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, role, workDays, active } = body

    const existing = await prisma.employee.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })
    }

    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return NextResponse.json({ error: 'Nome inválido' }, { status: 400 })
    }

    if (role !== undefined && !Object.values(Role).includes(role)) {
      return NextResponse.json({ error: 'Função inválida' }, { status: 400 })
    }

    if (
      workDays !== undefined &&
      (!Array.isArray(workDays) || workDays.some((d) => typeof d !== 'number' || d < 0 || d > 6))
    ) {
      return NextResponse.json({ error: 'Dias de trabalho inválidos' }, { status: 400 })
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(role !== undefined && { role }),
        ...(workDays !== undefined && { workDays }),
        ...(active !== undefined && { active }),
      },
    })

    return NextResponse.json(employee)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar funcionário' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await prisma.employee.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })
    }

    await prisma.employee.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir funcionário' }, { status: 500 })
  }
}
