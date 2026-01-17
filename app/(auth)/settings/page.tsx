'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Modal } from '@/components/ui'

interface Settings {
  house_name: string
  printer_ip: string
  printer_type: string
  timezone: string
}

const PRINTER_TYPES = ['EPSON', 'STAR', 'TANCA', 'DARUMA']

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)' },
  { value: 'America/Recife', label: 'Recife (GMT-3)' },
  { value: 'America/Bahia', label: 'Bahia (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (GMT-4)' },
  { value: 'America/Porto_Velho', label: 'Porto Velho (GMT-4)' },
  { value: 'America/Boa_Vista', label: 'Boa Vista (GMT-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
  { value: 'America/Belem', label: 'Belém (GMT-3)' },
  { value: 'America/Maceio', label: 'Maceió (GMT-3)' },
  { value: 'America/Araguaina', label: 'Araguaína (GMT-3)' },
  { value: 'America/Campo_Grande', label: 'Campo Grande (GMT-4)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (GMT-2)' },
  { value: 'America/Santarem', label: 'Santarém (GMT-3)' },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [printerStatus, setPrinterStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle')
  const [showPinModal, setShowPinModal] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/settings')
      if (!res.ok) throw new Error('Erro ao carregar configurações')
      const data = await res.json()
      setSettings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = async () => {
    if (!settings) return

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar')
      }

      setSuccess('Configurações salvas com sucesso!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleTestPrinter = async () => {
    try {
      setPrinterStatus('testing')
      const res = await fetch('/api/settings/test-printer', { method: 'POST' })
      const data = await res.json()

      if (res.ok) {
        setPrinterStatus('connected')
        setSuccess('Teste impresso com sucesso!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setPrinterStatus('error')
        setError(data.error || 'Erro ao testar impressora')
      }
    } catch {
      setPrinterStatus('error')
      setError('Erro ao conectar com a impressora')
    }
  }

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (settings) {
      setSettings({ ...settings, [key]: value })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <div className="text-center py-8 text-[var(--muted-foreground)]">Carregando...</div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <div className="p-3 rounded-lg bg-red-100 text-red-800">Erro ao carregar configurações</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Configurações</h1>

      {error && (
        <div className="p-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Geral</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome da casa</label>
            <Input
              value={settings.house_name}
              onChange={(e) => updateSetting('house_name', e.target.value)}
              placeholder="Minha Casa"
              maxLength={50}
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Este nome aparece nas impressões
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Impressora</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">IP da impressora</label>
            <Input
              value={settings.printer_ip}
              onChange={(e) => updateSetting('printer_ip', e.target.value)}
              placeholder="192.168.1.230"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select
              value={settings.printer_type}
              onChange={(e) => updateSetting('printer_type', e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)]"
            >
              {PRINTER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm">Status:</span>
            {printerStatus === 'idle' && (
              <span className="text-[var(--muted-foreground)]">Não testada</span>
            )}
            {printerStatus === 'testing' && <span className="text-yellow-600">Testando...</span>}
            {printerStatus === 'connected' && <span className="text-green-600">Conectada</span>}
            {printerStatus === 'error' && <span className="text-red-600">Erro de conexão</span>}
          </div>

          <Button variant="secondary" onClick={handleTestPrinter} disabled={printerStatus === 'testing'}>
            {printerStatus === 'testing' ? 'Testando...' : 'Testar e imprimir página de teste'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">PIN de acesso</label>
            <p className="text-[var(--muted-foreground)]">****</p>
          </div>

          <Button variant="secondary" onClick={() => setShowPinModal(true)}>
            Alterar PIN
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fuso Horário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Fuso horário</label>
            <select
              value={settings.timezone}
              onChange={(e) => updateSetting('timezone', e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)]"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Usado para calcular quais tarefas aparecem em cada dia (baseado na recorrência)
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <Modal open={showPinModal} onClose={() => setShowPinModal(false)} title="Alterar PIN">
        <ChangePinForm
          onSuccess={() => {
            setShowPinModal(false)
            setSuccess('PIN alterado com sucesso!')
            setTimeout(() => setSuccess(null), 3000)
          }}
          onCancel={() => setShowPinModal(false)}
        />
      </Modal>
    </div>
  )
}

interface ChangePinFormProps {
  onSuccess: () => void
  onCancel: () => void
}

function ChangePinForm({ onSuccess, onCancel }: ChangePinFormProps) {
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPin !== confirmPin) {
      setError('Os PINs não coincidem')
      return
    }

    if (!/^\d{4,8}$/.test(newPin)) {
      setError('O PIN deve ter entre 4 e 8 dígitos')
      return
    }

    try {
      setSubmitting(true)

      const res = await fetch('/api/settings/pin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao alterar PIN')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar PIN')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">PIN atual</label>
        <Input
          type="password"
          value={currentPin}
          onChange={(e) => setCurrentPin(e.target.value)}
          placeholder="****"
          maxLength={8}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Novo PIN</label>
        <Input
          type="password"
          value={newPin}
          onChange={(e) => setNewPin(e.target.value)}
          placeholder="****"
          maxLength={8}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Confirmar novo PIN</label>
        <Input
          type="password"
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value)}
          placeholder="****"
          maxLength={8}
        />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Alterando...' : 'Alterar'}
        </Button>
      </div>
    </form>
  )
}
