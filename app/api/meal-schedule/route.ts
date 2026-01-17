import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MealType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // format: YYYY-MM
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let whereDate = {}

    if (month) {
      const parts = month.split('-').map(Number)
      const year = parts[0] ?? 2024
      const monthNum = parts[1] ?? 1
      const monthStart = new Date(year, monthNum - 1, 1)
      const monthEnd = new Date(year, monthNum, 0)
      whereDate = {
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      }
    } else if (startDate && endDate) {
      whereDate = {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }
    }

    const schedules = await prisma.mealSchedule.findMany({
      where: whereDate,
      include: {
        dish: {
          select: { id: true, name: true, category: true },
        },
        employee: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ date: 'asc' }, { mealType: 'asc' }],
    })

    return NextResponse.json(schedules)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar cardápio' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, mealType, dishId, employeeId, notes } = body

    if (!date || !mealType || !dishId) {
      return NextResponse.json({ error: 'date, mealType e dishId são obrigatórios' }, { status: 400 })
    }

    if (!Object.values(MealType).includes(mealType)) {
      return NextResponse.json({ error: 'Tipo de refeição inválido' }, { status: 400 })
    }

    const dish = await prisma.dish.findUnique({ where: { id: dishId } })
    if (!dish) {
      return NextResponse.json({ error: 'Prato não encontrado' }, { status: 400 })
    }

    if (employeeId) {
      const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
      if (!employee) {
        return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 400 })
      }
    }

    const dateObj = new Date(date)
    dateObj.setHours(0, 0, 0, 0)

    // Upsert to handle existing schedule
    const schedule = await prisma.mealSchedule.upsert({
      where: {
        date_mealType: {
          date: dateObj,
          mealType,
        },
      },
      update: {
        dishId,
        employeeId: employeeId || null,
        notes: notes || null,
      },
      create: {
        date: dateObj,
        mealType,
        dishId,
        employeeId: employeeId || null,
        notes: notes || null,
      },
      include: {
        dish: {
          select: { id: true, name: true, category: true },
        },
        employee: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(schedule, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao salvar cardápio' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const mealType = searchParams.get('mealType')

    if (!date || !mealType) {
      return NextResponse.json({ error: 'date e mealType são obrigatórios' }, { status: 400 })
    }

    const dateObj = new Date(date)
    dateObj.setHours(0, 0, 0, 0)

    await prisma.mealSchedule.delete({
      where: {
        date_mealType: {
          date: dateObj,
          mealType: mealType as MealType,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir cardápio' }, { status: 500 })
  }
}
