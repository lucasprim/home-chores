import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DishCategory } from '@prisma/client'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const dish = await prisma.dish.findUnique({
      where: { id },
    })

    if (!dish) {
      return NextResponse.json({ error: 'Prato não encontrado' }, { status: 404 })
    }

    return NextResponse.json(dish)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar prato' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, categories, active } = body

    const existing = await prisma.dish.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Prato não encontrado' }, { status: 404 })
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return NextResponse.json({ error: 'Nome deve ter pelo menos 2 caracteres' }, { status: 400 })
      }
      if (name.length > 100) {
        return NextResponse.json({ error: 'Nome deve ter no máximo 100 caracteres' }, { status: 400 })
      }
    }

    if (categories !== undefined) {
      if (!Array.isArray(categories) || categories.length === 0) {
        return NextResponse.json({ error: 'Selecione pelo menos uma categoria' }, { status: 400 })
      }
      const validCategories = categories.filter((c: string) =>
        Object.values(DishCategory).includes(c as DishCategory)
      )
      if (validCategories.length === 0) {
        return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 })
      }
    }

    const dish = await prisma.dish.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(categories !== undefined && {
          categories: categories.filter((c: string) =>
            Object.values(DishCategory).includes(c as DishCategory)
          ),
        }),
        ...(active !== undefined && { active }),
      },
    })

    return NextResponse.json(dish)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar prato' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await prisma.dish.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Prato não encontrado' }, { status: 404 })
    }

    // Soft delete
    await prisma.dish.update({
      where: { id },
      data: { active: false },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir prato' }, { status: 500 })
  }
}
