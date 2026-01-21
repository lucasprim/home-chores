import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { printCustomMessage, PrinterType } from '@/lib/printer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, saveMessage, messageId } = body

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ error: 'Titulo e obrigatorio' }, { status: 400 })
    }

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return NextResponse.json({ error: 'Conteudo e obrigatorio' }, { status: 400 })
    }

    if (title.length > 100) {
      return NextResponse.json({ error: 'Titulo deve ter no maximo 100 caracteres' }, { status: 400 })
    }

    // Get printer settings
    const [ipRecord, typeRecord, houseRecord] = await Promise.all([
      prisma.settings.findUnique({ where: { key: 'printer_ip' } }),
      prisma.settings.findUnique({ where: { key: 'printer_type' } }),
      prisma.settings.findUnique({ where: { key: 'house_name' } }),
    ])

    const printerIp = ipRecord?.value ?? '192.168.1.230'
    const printerType = (typeRecord?.value ?? 'EPSON') as PrinterType
    const houseName = houseRecord?.value ?? 'Minha Casa'

    // Handle save/update logic
    let savedMessage = null

    if (messageId) {
      // Update existing message and update lastUsedAt
      const existing = await prisma.printMessage.findUnique({ where: { id: messageId } })
      if (existing && existing.active) {
        savedMessage = await prisma.printMessage.update({
          where: { id: messageId },
          data: {
            title: title.trim(),
            content: content.trim(),
            lastUsedAt: new Date(),
          },
        })
      }
    } else if (saveMessage) {
      // Create new saved message
      savedMessage = await prisma.printMessage.create({
        data: {
          title: title.trim(),
          content: content.trim(),
          lastUsedAt: new Date(),
        },
      })
    }

    // Print the message
    await printCustomMessage({
      ip: printerIp,
      type: printerType,
      houseName,
      title: title.trim(),
      content: content.trim(),
    })

    return NextResponse.json({
      success: true,
      message: 'Mensagem impressa com sucesso!',
      savedMessage,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao imprimir mensagem' },
      { status: 500 }
    )
  }
}
