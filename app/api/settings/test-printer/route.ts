import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { testPrinterConnection, printTestPage } from '@/lib/printer'

export async function POST() {
  try {
    const ipRecord = await prisma.settings.findUnique({ where: { key: 'printer_ip' } })
    const typeRecord = await prisma.settings.findUnique({ where: { key: 'printer_type' } })
    const houseRecord = await prisma.settings.findUnique({ where: { key: 'house_name' } })

    const printerIp = ipRecord?.value ?? '192.168.1.230'
    const printerType = (typeRecord?.value ?? 'EPSON') as 'EPSON' | 'STAR' | 'TANCA' | 'DARUMA'
    const houseName = houseRecord?.value ?? 'Minha Casa'

    const connected = await testPrinterConnection(printerIp)

    if (!connected) {
      return NextResponse.json(
        { success: false, error: 'Impressora não está respondendo. Verifique a conexão.' },
        { status: 503 }
      )
    }

    await printTestPage(printerIp, printerType, houseName)

    return NextResponse.json({ success: true, message: 'Teste impresso com sucesso!' })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro ao testar impressora' },
      { status: 500 }
    )
  }
}
