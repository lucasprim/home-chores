'use client'

import { useState, useEffect } from 'react'
import { Modal } from './ui/modal'
import { Button } from './ui/button'

export interface RecurrenceConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  weeklyDays: number[] // 0=Mon, 1=Tue, ..., 6=Sun
  monthlyType: 'dayOfMonth' | 'dayOfWeek'
  monthDay: number // 1-31
  monthWeekday: number // 0=Mon, 1=Tue, ..., 6=Sun
  monthWeekdayOrdinal: number // 1=first, 2=second, 3=third, 4=fourth, -1=last
  endType: 'never' | 'count' | 'date'
  endCount: number
  endDate: string // ISO date string
}

const DEFAULT_CONFIG: RecurrenceConfig = {
  frequency: 'weekly',
  interval: 1,
  weeklyDays: [0, 1, 2, 3, 4], // Mon-Fri
  monthlyType: 'dayOfMonth',
  monthDay: 1,
  monthWeekday: 0,
  monthWeekdayOrdinal: 1,
  endType: 'never',
  endCount: 10,
  endDate: '',
}

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const DAY_LABELS_FULL = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo']
const ORDINAL_LABELS = ['primeiro', 'segundo', 'terceiro', 'quarto', 'último']
const ORDINAL_VALUES = [1, 2, 3, 4, -1]

const FREQUENCY_LABELS = {
  daily: { singular: 'dia', plural: 'dias' },
  weekly: { singular: 'semana', plural: 'semanas' },
  monthly: { singular: 'mês', plural: 'meses' },
  yearly: { singular: 'ano', plural: 'anos' },
}

interface RecurrenceDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (rrule: string, config: RecurrenceConfig) => void
  initialRrule?: string
}

export function RecurrenceDialog({ open, onClose, onConfirm, initialRrule }: RecurrenceDialogProps) {
  const [config, setConfig] = useState<RecurrenceConfig>(DEFAULT_CONFIG)

  useEffect(() => {
    if (initialRrule && open) {
      const parsed = parseRruleToConfig(initialRrule)
      setConfig(parsed)
    } else if (open) {
      setConfig(DEFAULT_CONFIG)
    }
  }, [initialRrule, open])

  const updateConfig = <K extends keyof RecurrenceConfig>(key: K, value: RecurrenceConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const toggleWeeklyDay = (day: number) => {
    setConfig(prev => ({
      ...prev,
      weeklyDays: prev.weeklyDays.includes(day)
        ? prev.weeklyDays.filter(d => d !== day)
        : [...prev.weeklyDays, day].sort()
    }))
  }

  const handleConfirm = () => {
    const rrule = configToRrule(config)
    onConfirm(rrule, config)
    onClose()
  }

  const getSummary = () => {
    return configToReadable(config)
  }

  return (
    <Modal open={open} onClose={onClose} title="Recorrência personalizada">
      <div className="space-y-5">
        {/* Frequency and Interval */}
        <div className="flex items-center gap-3">
          <span className="text-sm">Repetir a cada</span>
          <input
            type="number"
            min={1}
            max={99}
            value={config.interval}
            onChange={(e) => updateConfig('interval', Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 h-9 px-2 text-center rounded-lg border border-[var(--border)] bg-[var(--background)]"
          />
          <select
            value={config.frequency}
            onChange={(e) => updateConfig('frequency', e.target.value as RecurrenceConfig['frequency'])}
            className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)]"
          >
            <option value="daily">{config.interval === 1 ? FREQUENCY_LABELS.daily.singular : FREQUENCY_LABELS.daily.plural}</option>
            <option value="weekly">{config.interval === 1 ? FREQUENCY_LABELS.weekly.singular : FREQUENCY_LABELS.weekly.plural}</option>
            <option value="monthly">{config.interval === 1 ? FREQUENCY_LABELS.monthly.singular : FREQUENCY_LABELS.monthly.plural}</option>
            <option value="yearly">{config.interval === 1 ? FREQUENCY_LABELS.yearly.singular : FREQUENCY_LABELS.yearly.plural}</option>
          </select>
        </div>

        {/* Weekly: Day picker */}
        {config.frequency === 'weekly' && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Repetir em</span>
            <div className="flex gap-1 flex-wrap">
              {DAY_LABELS.map((label, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleWeeklyDay(index)}
                  className={`
                    w-10 h-10 rounded-full text-sm font-medium transition-all
                    ${config.weeklyDays.includes(index)
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md'
                      : 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--muted)]'
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Monthly options */}
        {config.frequency === 'monthly' && (
          <div className="space-y-3">
            <span className="text-sm font-medium">Repetir em</span>

            {/* Option 1: Day of month */}
            <label className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] cursor-pointer hover:bg-[var(--secondary)] transition-colors">
              <input
                type="radio"
                name="monthlyType"
                checked={config.monthlyType === 'dayOfMonth'}
                onChange={() => updateConfig('monthlyType', 'dayOfMonth')}
                className="w-4 h-4"
              />
              <span className="text-sm">No dia</span>
              <select
                value={config.monthDay}
                onChange={(e) => updateConfig('monthDay', parseInt(e.target.value))}
                disabled={config.monthlyType !== 'dayOfMonth'}
                className="h-8 px-2 rounded-lg border border-[var(--border)] bg-[var(--background)] disabled:opacity-50"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              <span className="text-sm text-[var(--muted-foreground)]">de cada mês</span>
            </label>

            {/* Option 2: Day of week (e.g., "first Monday") */}
            <label className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] cursor-pointer hover:bg-[var(--secondary)] transition-colors">
              <input
                type="radio"
                name="monthlyType"
                checked={config.monthlyType === 'dayOfWeek'}
                onChange={() => updateConfig('monthlyType', 'dayOfWeek')}
                className="w-4 h-4"
              />
              <span className="text-sm">No</span>
              <select
                value={config.monthWeekdayOrdinal}
                onChange={(e) => updateConfig('monthWeekdayOrdinal', parseInt(e.target.value))}
                disabled={config.monthlyType !== 'dayOfWeek'}
                className="h-8 px-2 rounded-lg border border-[var(--border)] bg-[var(--background)] disabled:opacity-50"
              >
                {ORDINAL_VALUES.map((val, i) => (
                  <option key={val} value={val}>{ORDINAL_LABELS[i]}</option>
                ))}
              </select>
              <select
                value={config.monthWeekday}
                onChange={(e) => updateConfig('monthWeekday', parseInt(e.target.value))}
                disabled={config.monthlyType !== 'dayOfWeek'}
                className="h-8 px-2 rounded-lg border border-[var(--border)] bg-[var(--background)] disabled:opacity-50"
              >
                {DAY_LABELS_FULL.map((label, i) => (
                  <option key={i} value={i}>{label}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        {/* End options */}
        <div className="space-y-3 pt-2 border-t border-[var(--border)]">
          <span className="text-sm font-medium">Termina</span>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="endType"
              checked={config.endType === 'never'}
              onChange={() => updateConfig('endType', 'never')}
              className="w-4 h-4"
            />
            <span className="text-sm">Nunca</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="endType"
              checked={config.endType === 'count'}
              onChange={() => updateConfig('endType', 'count')}
              className="w-4 h-4"
            />
            <span className="text-sm">Após</span>
            <input
              type="number"
              min={1}
              max={999}
              value={config.endCount}
              onChange={(e) => updateConfig('endCount', Math.max(1, parseInt(e.target.value) || 1))}
              disabled={config.endType !== 'count'}
              className="w-16 h-8 px-2 text-center rounded-lg border border-[var(--border)] bg-[var(--background)] disabled:opacity-50"
            />
            <span className="text-sm">ocorrências</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="endType"
              checked={config.endType === 'date'}
              onChange={() => updateConfig('endType', 'date')}
              className="w-4 h-4"
            />
            <span className="text-sm">Em</span>
            <input
              type="date"
              value={config.endDate}
              onChange={(e) => updateConfig('endDate', e.target.value)}
              disabled={config.endType !== 'date'}
              className="h-8 px-2 rounded-lg border border-[var(--border)] bg-[var(--background)] disabled:opacity-50"
            />
          </label>
        </div>

        {/* Summary */}
        <div className="p-3 rounded-lg bg-[var(--secondary)]">
          <p className="text-sm text-[var(--muted-foreground)]">Resumo</p>
          <p className="text-sm font-medium mt-1">{getSummary()}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={config.frequency === 'weekly' && config.weeklyDays.length === 0}>
            Confirmar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Convert config to RRULE string
function configToRrule(config: RecurrenceConfig): string {
  const parts: string[] = []

  // Frequency
  const freqMap = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' }
  parts.push(`FREQ=${freqMap[config.frequency]}`)

  // Interval (only if > 1)
  if (config.interval > 1) {
    parts.push(`INTERVAL=${config.interval}`)
  }

  // Weekly days
  if (config.frequency === 'weekly' && config.weeklyDays.length > 0) {
    const dayMap = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
    const days = config.weeklyDays.map(d => dayMap[d]).join(',')
    parts.push(`BYDAY=${days}`)
  }

  // Monthly
  if (config.frequency === 'monthly') {
    if (config.monthlyType === 'dayOfMonth') {
      parts.push(`BYMONTHDAY=${config.monthDay}`)
    } else {
      const dayMap = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
      const ordinal = config.monthWeekdayOrdinal
      parts.push(`BYDAY=${ordinal}${dayMap[config.monthWeekday]}`)
    }
  }

  // End condition
  if (config.endType === 'count') {
    parts.push(`COUNT=${config.endCount}`)
  } else if (config.endType === 'date' && config.endDate) {
    const date = new Date(config.endDate)
    const until = date.toISOString().replace(/[-:]/g, '').split('T')[0] + 'T235959Z'
    parts.push(`UNTIL=${until}`)
  }

  return parts.join(';')
}

// Parse RRULE string to config
function parseRruleToConfig(rrule: string): RecurrenceConfig {
  const config: RecurrenceConfig = { ...DEFAULT_CONFIG }
  const normalized = rrule.replace('RRULE:', '')
  const parts = normalized.split(';')

  for (const part of parts) {
    const [key, value] = part.split('=')
    if (!value) continue

    switch (key) {
      case 'FREQ':
        config.frequency = value.toLowerCase() as RecurrenceConfig['frequency']
        break
      case 'INTERVAL':
        config.interval = parseInt(value) || 1
        break
      case 'BYDAY': {
        const dayMap: Record<string, number> = { MO: 0, TU: 1, WE: 2, TH: 3, FR: 4, SA: 5, SU: 6 }
        const dayParts = value.split(',')

        // Check if it's a monthly ordinal pattern (e.g., "2MO" for second Monday)
        const ordinalMatch = value.match(/^(-?\d+)([A-Z]{2})$/)
        if (ordinalMatch && ordinalMatch[1] && ordinalMatch[2]) {
          config.monthlyType = 'dayOfWeek'
          config.monthWeekdayOrdinal = parseInt(ordinalMatch[1])
          config.monthWeekday = dayMap[ordinalMatch[2]] ?? 0
        } else {
          // Weekly days
          config.weeklyDays = dayParts
            .map(d => {
              const match = d.match(/([A-Z]{2})/)
              return match && match[1] ? dayMap[match[1]] ?? -1 : -1
            })
            .filter(d => d >= 0)
            .sort()
        }
        break
      }
      case 'BYMONTHDAY':
        config.monthlyType = 'dayOfMonth'
        config.monthDay = parseInt(value) || 1
        break
      case 'COUNT':
        config.endType = 'count'
        config.endCount = parseInt(value) || 10
        break
      case 'UNTIL': {
        config.endType = 'date'
        // Parse UNTIL format: YYYYMMDDTHHMMSSZ or YYYYMMDD
        const year = value.slice(0, 4)
        const month = value.slice(4, 6)
        const day = value.slice(6, 8)
        config.endDate = `${year}-${month}-${day}`
        break
      }
    }
  }

  return config
}

// Convert config to human-readable string
function configToReadable(config: RecurrenceConfig): string {
  const freq = FREQUENCY_LABELS[config.frequency]
  let text = ''

  // Interval + frequency
  if (config.interval === 1) {
    switch (config.frequency) {
      case 'daily': text = 'Diariamente'; break
      case 'weekly': text = 'Semanalmente'; break
      case 'monthly': text = 'Mensalmente'; break
      case 'yearly': text = 'Anualmente'; break
    }
  } else {
    text = `A cada ${config.interval} ${freq.plural}`
  }

  // Weekly days
  if (config.frequency === 'weekly' && config.weeklyDays.length > 0) {
    if (config.weeklyDays.length === 7) {
      text = config.interval === 1 ? 'Diariamente' : `A cada ${config.interval} dias`
    } else if (arraysEqual(config.weeklyDays, [0, 1, 2, 3, 4])) {
      text += ' nos dias úteis'
    } else {
      const days = config.weeklyDays.map(d => DAY_LABELS[d]).join(', ')
      text += ` em ${days}`
    }
  }

  // Monthly
  if (config.frequency === 'monthly') {
    if (config.monthlyType === 'dayOfMonth') {
      text += ` no dia ${config.monthDay}`
    } else {
      const ordinalIdx = ORDINAL_VALUES.indexOf(config.monthWeekdayOrdinal)
      const ordinal = ordinalIdx >= 0 ? ORDINAL_LABELS[ordinalIdx] : ''
      text += ` no ${ordinal} ${DAY_LABELS_FULL[config.monthWeekday]}`
    }
  }

  // End condition
  if (config.endType === 'count') {
    text += `, ${config.endCount} vezes`
  } else if (config.endType === 'date' && config.endDate) {
    const date = new Date(config.endDate + 'T12:00:00')
    text += `, até ${date.toLocaleDateString('pt-BR')}`
  }

  return text
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}

// Export helper for external use
export { configToRrule, parseRruleToConfig, configToReadable }
