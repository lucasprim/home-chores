import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MealType, DishCategory } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { startDate, endDate, mealTypes, overwrite } = body

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate e endDate são obrigatórios' }, { status: 400 })
    }

    // Parse date strings as local dates (not UTC)
    // "2026-01-31" -> new Date(2026, 0, 31) which is local midnight
    const parseLocalDate = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number)
      return new Date(year!, month! - 1, day!)
    }

    const start = parseLocalDate(startDate)
    const end = parseLocalDate(endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Datas inválidas' }, { status: 400 })
    }

    const typesToRandomize: MealType[] = mealTypes || ['ALMOCO', 'JANTAR']

    // Map meal types to dish categories (they match 1:1)
    const mealToCategory: Record<MealType, DishCategory> = {
      CAFE_MANHA: 'CAFE_MANHA',
      ALMOCO: 'ALMOCO',
      JANTAR: 'JANTAR',
      LANCHE: 'LANCHE',
      SOBREMESA: 'SOBREMESA',
      BEBIDA: 'BEBIDA',
    }

    // Get active dishes
    const dishes = await prisma.dish.findMany({
      where: { active: true },
    })

    // Group dishes by category (a dish can appear in multiple categories)
    const dishesByCategory: Record<string, typeof dishes> = {}
    for (const dish of dishes) {
      for (const category of dish.categories) {
        if (!dishesByCategory[category]) {
          dishesByCategory[category] = []
        }
        dishesByCategory[category]!.push(dish)
      }
    }

    let created = 0
    let skipped = 0

    // Iterate through dates
    const currentDate = new Date(start)
    while (currentDate <= end) {
      const dateObj = new Date(currentDate)
      dateObj.setHours(0, 0, 0, 0)

      for (const mealType of typesToRandomize) {
        const category = mealToCategory[mealType]
        const availableDishes = dishesByCategory[category] || []

        if (availableDishes.length === 0) {
          skipped++
          continue
        }

        // Check if schedule already exists
        const existing = await prisma.mealSchedule.findUnique({
          where: {
            date_mealType: {
              date: dateObj,
              mealType,
            },
          },
        })

        if (existing && !overwrite) {
          skipped++
          continue
        }

        // Pick random dish
        const randomDish = availableDishes[Math.floor(Math.random() * availableDishes.length)]

        if (!randomDish) {
          skipped++
          continue
        }

        await prisma.mealSchedule.upsert({
          where: {
            date_mealType: {
              date: dateObj,
              mealType,
            },
          },
          update: {
            dishId: randomDish.id,
          },
          create: {
            date: dateObj,
            mealType,
            dishId: randomDish.id,
          },
        })

        created++
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      message: `${created} refeições criadas, ${skipped} puladas`,
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao randomizar cardápio' }, { status: 500 })
  }
}
