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

/**
 * Returns a priority number for sorting tasks by frequency.
 * Lower numbers = more frequent = appear first.
 *
 * Priority scale:
 * 1 = daily
 * 2 = weekdays (5 days)
 * 3-9 = weekly (more days = lower number, so 6 days = 3, 1 day = 9)
 * 10 = monthly
 * 20 = yearly
 * 100 = custom/unknown
 */
export function getRecurrenceFrequencyPriority(rruleStr: string): number {
  const normalizedRule = rruleStr.replace('RRULE:', '')

  // Check for daily
  if (normalizedRule === 'FREQ=DAILY') {
    return 1
  }

  // Check for weekdays preset
  if (normalizedRule === 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR') {
    return 2
  }

  try {
    const rule = RRule.fromString(normalizedRule)
    const options = rule.options

    // Daily frequency
    if (options.freq === RRule.DAILY) {
      if (options.interval && options.interval > 1) {
        // Every N days - treat as less frequent than daily
        return Math.min(options.interval, 9)
      }
      return 1
    }

    // Weekly with specific days
    if (options.freq === RRule.WEEKLY && options.byweekday) {
      const numDays = options.byweekday.length

      // 7 days = daily (priority 1)
      if (numDays === 7) return 1

      // 5 weekdays check
      const weekdays = options.byweekday.map((d: Weekday | number) =>
        typeof d === 'number' ? d : d.weekday
      )
      const isWeekdays = numDays === 5 &&
        !weekdays.includes(5) && !weekdays.includes(6) &&
        weekdays.includes(0) && weekdays.includes(1) &&
        weekdays.includes(2) && weekdays.includes(3) && weekdays.includes(4)
      if (isWeekdays) return 2

      // More days = lower priority number (more frequent)
      // 6 days = 3, 5 days = 4, 4 days = 5, 3 days = 6, 2 days = 7, 1 day = 8
      return 9 - numDays
    }

    // Monthly
    if (options.freq === RRule.MONTHLY) {
      return 10
    }

    // Yearly
    if (options.freq === RRule.YEARLY) {
      return 20
    }

    return 100 // Unknown/custom
  } catch {
    return 100 // Parse error - treat as custom
  }
}
