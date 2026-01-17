import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { executePrintJob } from '@/lib/scheduler'

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const job = await prisma.printJob.findUnique({
      where: { id },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 })
    }

    const result = await executePrintJob(id)

    if (result.status === 'FAILED') {
      return NextResponse.json(result, { status: 500 })
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Erro ao executar job' }, { status: 500 })
  }
}
