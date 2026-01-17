import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') ?? '10', 10)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)

    const job = await prisma.printJob.findUnique({ where: { id } })
    if (!job) {
      return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 })
    }

    const [logs, total] = await Promise.all([
      prisma.printLog.findMany({
        where: { printJobId: id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.printLog.count({ where: { printJobId: id } }),
    ])

    return NextResponse.json({
      logs,
      total,
      hasMore: offset + logs.length < total,
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar logs' }, { status: 500 })
  }
}
