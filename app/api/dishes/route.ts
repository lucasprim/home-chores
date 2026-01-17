import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DishCategory } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const category = searchParams.get('category')

    const where: {
      active?: boolean
      category?: DishCategory
    } = {}

    if (active === 'true') where.active = true
    if (active === 'false') where.active = false
    if (category && Object.values(DishCategory).includes(category as DishCategory)) {
      where.category = category as DishCategory
    }

    const dishes = await prisma.dish.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json(dishes)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar pratos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, category, prepTime, servings, ingredients } = body

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Nome deve ter pelo menos 2 caracteres' }, { status: 400 })
    }

    if (name.length > 100) {
      return NextResponse.json({ error: 'Nome deve ter no máximo 100 caracteres' }, { status: 400 })
    }

    if (!category || !Object.values(DishCategory).includes(category)) {
      return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 })
    }

    const dish = await prisma.dish.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        category,
        prepTime: prepTime ? parseInt(prepTime) : null,
        servings: servings ? parseInt(servings) : null,
        ingredients: Array.isArray(ingredients) ? ingredients : [],
      },
    })

    return NextResponse.json(dish, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar prato' }, { status: 500 })
  }
}
