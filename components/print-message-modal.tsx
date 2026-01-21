'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThermalPaperPreview } from '@/components/thermal-paper-preview'

interface PrintMessage {
  id: string
  title: string
  content: string
  lastUsedAt: string | null
  createdAt: string
}

interface PrintMessageModalProps {
  open: boolean
  onClose: () => void
}

export function PrintMessageModal({ open, onClose }: PrintMessageModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<PrintMessage[]>([])
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saveMessage, setSaveMessage] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/print-messages')
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      }
    } catch {
      // ignore fetch errors
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchMessages()
      // Reset form when opening
      setSelectedMessageId(null)
      setTitle('')
      setContent('')
      setSaveMessage(false)
      setShowPreview(false)
      setPreview('')
      setError('')
      setSuccess('')
      setDeleteConfirm(null)
    }
  }, [open, fetchMessages])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  // Auto-update preview with debouncing
  useEffect(() => {
    if (!showPreview || !title.trim() || !content.trim()) {
      return
    }

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ title, content })
        const res = await fetch(`/api/print/message/preview?${params}`)
        if (res.ok) {
          const data = await res.json()
          setPreview(data.previewHtml)
        }
      } catch {
        // ignore preview errors
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [title, content, showPreview])

  const handleSelectMessage = (message: PrintMessage | null) => {
    if (message === null) {
      // "Nova mensagem" selected
      setSelectedMessageId(null)
      setTitle('')
      setContent('')
      setSaveMessage(false)
    } else {
      setSelectedMessageId(message.id)
      setTitle(message.title)
      setContent(message.content)
      setSaveMessage(true)
    }
    setShowPreview(false)
    setPreview('')
    setError('')
    setSuccess('')
  }

  const handlePreview = () => {
    if (!showPreview && (!title.trim() || !content.trim())) {
      setError('Preencha titulo e conteudo')
      return
    }
    setError('')
    setShowPreview(!showPreview)
  }

  const handlePrint = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Preencha titulo e conteudo')
      return
    }
    setError('')
    setSuccess('')
    setPrinting(true)

    try {
      const res = await fetch('/api/print/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          saveMessage: !selectedMessageId && saveMessage,
          messageId: selectedMessageId,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess('Mensagem impressa!')
        // Refresh messages list if we saved a new one or updated an existing one
        if (saveMessage || selectedMessageId) {
          await fetchMessages()
          // If we created a new message, select it
          if (data.savedMessage && !selectedMessageId) {
            setSelectedMessageId(data.savedMessage.id)
          }
        } else {
          // Quick print without saving - clear form
          setTitle('')
          setContent('')
          setShowPreview(false)
          setPreview('')
        }
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Erro ao imprimir')
      }
    } catch {
      setError('Erro ao imprimir')
    } finally {
      setPrinting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/print-messages/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchMessages()
        // If we deleted the selected message, clear the form
        if (selectedMessageId === id) {
          handleSelectMessage(null)
        }
      }
    } catch {
      setError('Erro ao excluir')
    }
    setDeleteConfirm(null)
  }

  if (!open) return null

  const modal = (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl bg-[var(--background)] shadow-xl animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
          <h2 id="modal-title" className="text-lg font-semibold">
            Imprimir Mensagem
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body - Two panels */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel - Saved messages */}
          <div className="w-48 flex-shrink-0 border-r border-[var(--border)] flex flex-col overflow-hidden">
            <div className="p-2 border-b border-[var(--border)] bg-[var(--muted)]">
              <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase">
                Mensagens
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* "Nova mensagem" option */}
              <button
                onClick={() => handleSelectMessage(null)}
                className={`w-full text-left px-3 py-2 text-sm border-b border-[var(--border)] transition-colors ${
                  selectedMessageId === null
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                    : 'hover:bg-[var(--muted)]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Nova mensagem
                </span>
              </button>

              {/* Saved messages list */}
              {loading ? (
                <div className="p-3 text-sm text-[var(--muted-foreground)]">Carregando...</div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`relative group border-b border-[var(--border)] ${
                      selectedMessageId === msg.id
                        ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                        : 'hover:bg-[var(--muted)]'
                    }`}
                  >
                    <button
                      onClick={() => handleSelectMessage(msg)}
                      className="w-full text-left px-3 py-2 text-sm pr-8"
                    >
                      <span className="block truncate">{msg.title}</span>
                    </button>
                    {/* Delete button */}
                    {deleteConfirm === msg.id ? (
                      <div className="absolute right-1 top-1 flex gap-1">
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="p-1 rounded bg-[var(--destructive)] text-[var(--destructive-foreground)] text-xs"
                          title="Confirmar"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="p-1 rounded bg-[var(--muted)] text-xs"
                          title="Cancelar"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(msg.id)}
                        className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                          selectedMessageId === msg.id
                            ? 'text-[var(--primary-foreground)] hover:bg-black/10'
                            : 'text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[var(--muted)]'
                        }`}
                        title="Excluir"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right panel - Form */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              <Input
                label="Titulo"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Aviso de Viagem"
                maxLength={100}
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Conteudo
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Suporta: # Titulo, ## Subtitulo, **negrito**, __sublinhado__, *italico*, - lista, 1. numeracao, ---"
                  className="w-full h-40 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent resize-none font-mono text-sm"
                />
              </div>

              {/* Save checkbox - only show for new messages */}
              {!selectedMessageId && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveMessage}
                    onChange={(e) => setSaveMessage(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--ring)]"
                  />
                  <span className="text-sm">Salvar para uso futuro</span>
                </label>
              )}

              {/* Preview section */}
              {showPreview && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-[var(--foreground)]">
                    Preview
                  </label>
                  <div className="overflow-auto max-h-[300px]">
                    {preview ? (
                      <ThermalPaperPreview html={preview} />
                    ) : (
                      <div className="text-center py-4 text-[var(--muted-foreground)]">
                        Carregando...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error/success messages */}
              {error && (
                <p className="text-sm text-[var(--destructive)]">{error}</p>
              )}
              {success && (
                <p className="text-sm text-green-600">{success}</p>
              )}
            </div>

            {/* Footer with actions */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border)] flex-shrink-0">
              <Button variant="secondary" onClick={handlePreview}>
                {showPreview ? 'Ocultar Preview' : 'Preview'}
              </Button>
              <Button onClick={handlePrint} disabled={printing}>
                {printing ? 'Imprimindo...' : 'Imprimir'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (typeof window === 'undefined') return null
  return createPortal(modal, document.body)
}
