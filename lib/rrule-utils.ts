import { RRule, Weekday } from 'rrule'

const DAY_NAMES: Record<number, string> = {
  0: 'Seg',
  1: 'Ter',
  2: 'Qua',
  3: 'Qui',
  4: 'Sex',
  5: 'Sáb',
  6: 'Dom',
}

const RRULE_PRESETS: Record<string, string> = {
  'FREQ=DAILY': 'Diariamente',
  'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR': 'Dias úteis',
}

export function rruleToReadable(rruleStr: string): string {
  // Check presets first
  const normalizedRule = rruleStr.replace('RRULE:', '')
  if (RRULE_PRESETS[normalizedRule]) {
    return RRULE_PRESETS[normalizedRule]
  }

  try {
    const rule = RRule.fromString(normalizedRule)
    const options = rule.options

    // Daily
    if (options.freq === RRule.DAILY) {
      if (options.interval && options.interval > 1) {
        return `A cada ${options.interval} dias`
      }
      return 'Diariamente'
    }

    // Weekly with specific days
    if (options.freq === RRule.WEEKLY && options.byweekday) {
      const days = options.byweekday
        .map((d: Weekday | number) => {
          const weekday = typeof d === 'number' ? d : d.weekday
          return DAY_NAMES[weekday]
        })
        .filter(Boolean)

      if (days.length === 5 && !options.byweekday.includes(5) && !options.byweekday.includes(6)) {
        return 'Dias úteis'
      }

      if (days.length === 7) {
        return 'Diariamente'
      }

      return days.join(', ')
    }

    // Monthly
    if (options.freq === RRule.MONTHLY) {
      if (options.bymonthday && options.bymonthday.length > 0) {
        const day = options.bymonthday[0]
        return `Todo dia ${day} do mês`
      }
      return 'Mensalmente'
    }

    // Yearly
    if (options.freq === RRule.YEARLY) {
      return 'Anualmente'
    }

    return 'Personalizado'
  } catch {
    return 'Inválido'
  }
}

export function createDailyRule(): string {
  return 'FREQ=DAILY'
}

export function createWeekdaysRule(): string {
  return 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'
}

export function createWeeklyRule(days: number[]): string {
  const dayMap = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
  const byDay = days.map((d) => dayMap[d]).join(',')
  return `FREQ=WEEKLY;BYDAY=${byDay}`
}

export function createMonthlyRule(day: number): string {
  return `FREQ=MONTHLY;BYMONTHDAY=${day}`
}

export function parseRuleToPreset(rruleStr: string): {
  type: 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'custom'
  days?: number[]
  monthDay?: number
} {
  const normalizedRule = rruleStr.replace('RRULE:', '')

  if (normalizedRule === 'FREQ=DAILY') {
    return { type: 'daily' }
  }

  if (normalizedRule === 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR') {
    return { type: 'weekdays' }
  }

  try {
    const rule = RRule.fromString(normalizedRule)
    const options = rule.options

    if (options.freq === RRule.WEEKLY && options.byweekday) {
      const days = options.byweekday.map((d: Weekday | number) =>
        typeof d === 'number' ? d : d.weekday
      )
      return { type: 'weekly', days }
    }

    if (options.freq === RRule.MONTHLY && options.bymonthday && options.bymonthday.length > 0) {
      return { type: 'monthly', monthDay: options.bymonthday[0] }
    }
  } catch {
    // Ignore parse errors
  }

  return { type: 'custom' }
}

export function isTaskScheduledForDate(rruleStr: string, date: Date): boolean {
  try {
    const normalizedRule = rruleStr.replace('RRULE:', '')
    const rule = RRule.fromString(normalizedRule)

    // Set dtstart to a date far in the past so between() works correctly
    // Without dtstart, RRule can't calculate occurrences properly
    const ruleWithStart = new RRule({
      ...rule.origOptions,
      dtstart: new Date(Date.UTC(2000, 0, 1, 0, 0, 0)),
    })

    // Use UTC dates to avoid timezone issues
    const startOfDay = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0))
    const endOfDay = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59))

    const occurrences = ruleWithStart.between(startOfDay, endOfDay, true)
    return occurrences.length > 0
  } catch {
    return false
  }
}
