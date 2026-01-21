'use client'

import { thermalPaperStyles } from '@/lib/escpos-to-html'

interface ThermalPaperPreviewProps {
  html: string
  className?: string
}

export function ThermalPaperPreview({ html, className = '' }: ThermalPaperPreviewProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: thermalPaperStyles }} />
      <div
        className={`thermal-paper ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  )
}
