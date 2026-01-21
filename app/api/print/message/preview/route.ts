import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatMessagePage } from '@/lib/printer'
import { escPosToHtml } from '@/lib/escpos-to-html'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title')
    const content = searchParams.get('content')

    if (!title || !content) {
      return NextResponse.json({ error: 'title e content sao obrigatorios' }, { status: 400 })
    }

    // Get house name for preview
    const houseRecord = await prisma.settings.findUnique({ where: { key: 'house_name' } })
    const houseName = houseRecord?.value ?? 'Minha Casa'

    // Generate ESC/POS and convert to HTML
    const escPosData = formatMessagePage(houseName, title, content)
    const previewHtml = escPosToHtml(escPosData)

    return NextResponse.json({ previewHtml })
  } catch {
    return NextResponse.json({ error: 'Erro ao gerar preview' }, { status: 500 })
  }
}
