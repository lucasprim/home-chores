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

export function isTaskScheduledForDate(rruleStr: string, date: Date, startDate?: Date | null): boolean {
  try {
    // If startDate is specified and target date is before it, task is not scheduled
    if (startDate) {
      const targetDateOnly = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
      const startDateOnly = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()))
      if (targetDateOnly < startDateOnly) {
        return false
      }
    }

    const normalizedRule = rruleStr.replace('RRULE:', '')
    const dayOfWeek = date.getDay()

    // Fast path for common presets - avoid RRule parsing entirely
    if (normalizedRule === 'FREQ=DAILY') {
      return true // Daily tasks run every day
    }

    if (normalizedRule === 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR') {
      return dayOfWeek >= 1 && dayOfWeek <= 5 // Weekdays only
    }

    // Fast path for simple weekly rules with BYDAY
    const weeklyMatch = normalizedRule.match(/^FREQ=WEEKLY;BYDAY=([A-Z,]+)$/)
    if (weeklyMatch && weeklyMatch[1]) {
      const dayMap: Record<string, number> = {
        SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
      }
      const scheduledDays = weeklyMatch[1].split(',').map((d) => dayMap[d]).filter((d): d is number => d !== undefined)
      return scheduledDays.includes(dayOfWeek)
    }

    // Fall back to full RRule parsing for complex rules
    const rule = RRule.fromString(normalizedRule)

    // Use startDate as dtstart for RRule calculation (if provided), otherwise use far past date
    const dtstart = startDate
      ? new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0))
      : new Date(Date.UTC(2000, 0, 1, 0, 0, 0))

    const ruleWithStart = new RRule({
      ...rule.origOptions,
      dtstart,
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
 * Returns an array of weekday numbers (0=Sunday, 1=Monday, ..., 6=Saturday)
 * when a task is scheduled to run based on its rrule.
 *
 * This is optimized for weekly schedule views - it extracts the weekdays
 * without doing expensive occurrence calculations.
 *
 * Note: For monthly/yearly rules, this returns the weekdays for a reference week.
 * For interval-based daily rules (every N days), calculates actual occurrences in the week.
 *
 * @param rruleStr - The rrule string
 * @param weekStart - Optional: The start date of the week being displayed (for startDate filtering)
 * @param taskStartDate - Optional: The task's startDate (for filtering out days before it starts)
 */
export function getScheduledWeekdays(
  rruleStr: string,
  weekStart?: Date | null,
  taskStartDate?: Date | null
): number[] {
  try {
    // If task has a startDate and the week ends before it, return empty (task doesn't appear this week)
    if (weekStart && taskStartDate) {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      const taskStartDateOnly = new Date(Date.UTC(taskStartDate.getFullYear(), taskStartDate.getMonth(), taskStartDate.getDate()))
      const weekEndDateOnly = new Date(Date.UTC(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate()))
      if (taskStartDateOnly > weekEndDateOnly) {
        return [] // Task starts after this week ends
      }
    }

    const normalizedRule = rruleStr.replace('RRULE:', '')

    // Fast path for common presets
    let baseWeekdays: number[]
    if (normalizedRule === 'FREQ=DAILY') {
      baseWeekdays = [0, 1, 2, 3, 4, 5, 6] // All days
    } else if (normalizedRule === 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR') {
      baseWeekdays = [1, 2, 3, 4, 5] // Weekdays (Mon-Fri)
    } else {
      const rule = RRule.fromString(normalizedRule)
      const options = rule.options

      // Daily frequency with interval > 1 requires actual calculation
      if (options.freq === RRule.DAILY && options.interval && options.interval > 1 && weekStart) {
        // For interval-based daily rules, we need to calculate actual occurrences
        const dtstart = taskStartDate
          ? new Date(Date.UTC(taskStartDate.getFullYear(), taskStartDate.getMonth(), taskStartDate.getDate(), 0, 0, 0))
          : new Date(Date.UTC(2000, 0, 1, 0, 0, 0))

        const ruleWithStart = new RRule({
          ...rule.origOptions,
          dtstart,
        })

        const weekStartUTC = new Date(Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 0, 0, 0))
        const weekEndUTC = new Date(Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6, 23, 59, 59))

        const occurrences = ruleWithStart.between(weekStartUTC, weekEndUTC, true)
        baseWeekdays = [...new Set(occurrences.map(d => d.getUTCDay()))]
      } else if (options.freq === RRule.DAILY) {
        // Simple daily (no interval or interval=1)
        baseWeekdays = [0, 1, 2, 3, 4, 5, 6] // All days
      } else if (options.freq === RRule.WEEKLY && options.byweekday) {
        // RRule uses 0=Monday, we need to convert to JS 0=Sunday
        const rruleToJsDayMap: Record<number, number> = {
          0: 1, // MO -> 1
          1: 2, // TU -> 2
          2: 3, // WE -> 3
          3: 4, // TH -> 4
          4: 5, // FR -> 5
          5: 6, // SA -> 6
          6: 0, // SU -> 0
        }

        baseWeekdays = options.byweekday.map((d: Weekday | number) => {
          const weekday = typeof d === 'number' ? d : d.weekday
          return rruleToJsDayMap[weekday] ?? weekday
        })
      } else if (options.freq === RRule.MONTHLY && weekStart) {
        // For monthly rules, calculate actual occurrences in this specific week
        const dtstart = taskStartDate
          ? new Date(Date.UTC(taskStartDate.getFullYear(), taskStartDate.getMonth(), taskStartDate.getDate(), 0, 0, 0))
          : new Date(Date.UTC(2000, 0, 1, 0, 0, 0))

        const ruleWithStart = new RRule({
          ...rule.origOptions,
          dtstart,
        })

        const weekStartUTC = new Date(Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 0, 0, 0))
        const weekEndUTC = new Date(Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6, 23, 59, 59))

        const occurrences = ruleWithStart.between(weekStartUTC, weekEndUTC, true)
        baseWeekdays = [...new Set(occurrences.map(d => d.getUTCDay()))]
      } else if (options.freq === RRule.MONTHLY) {
        // No weekStart provided - can't determine which days, return empty
        baseWeekdays = []
      } else if (options.freq === RRule.YEARLY && weekStart) {
        // For yearly rules, calculate actual occurrences in this specific week
        const dtstart = taskStartDate
          ? new Date(Date.UTC(taskStartDate.getFullYear(), taskStartDate.getMonth(), taskStartDate.getDate(), 0, 0, 0))
          : new Date(Date.UTC(2000, 0, 1, 0, 0, 0))

        const ruleWithStart = new RRule({
          ...rule.origOptions,
          dtstart,
        })

        const weekStartUTC = new Date(Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 0, 0, 0))
        const weekEndUTC = new Date(Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6, 23, 59, 59))

        const occurrences = ruleWithStart.between(weekStartUTC, weekEndUTC, true)
        baseWeekdays = [...new Set(occurrences.map(d => d.getUTCDay()))]
      } else if (options.freq === RRule.YEARLY) {
        // No weekStart provided - can't determine which days, return empty
        baseWeekdays = []
      } else {
        // For other complex rules without weekStart, return empty (can't determine)
        baseWeekdays = []
      }
    }

    // Filter out weekdays before the task's startDate if it falls within this week
    if (weekStart && taskStartDate) {
      const weekStartOnly = new Date(Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()))
      const taskStartOnly = new Date(Date.UTC(taskStartDate.getFullYear(), taskStartDate.getMonth(), taskStartDate.getDate()))

      // Only filter if taskStartDate is within or after this week
      if (taskStartOnly >= weekStartOnly) {
        // Calculate which day of the week the task starts
        // weekStart is typically Monday (day 1 in JS)
        const taskStartDayOfWeek = taskStartDate.getDay()

        // Filter out days before the task start
        return baseWeekdays.filter(dow => {
          // Calculate the date for this day of the week
          const dayOffset = dow === 0 ? 6 : dow - 1 // Convert JS dow to offset from Monday
          const weekStartDow = weekStart.getDay()
          const weekStartOffset = weekStartDow === 0 ? 6 : weekStartDow - 1

          // The actual date of this weekday
          const dayDate = new Date(weekStart)
          dayDate.setDate(weekStart.getDate() + (dayOffset - weekStartOffset))

          const dayDateOnly = new Date(Date.UTC(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate()))
          return dayDateOnly >= taskStartOnly
        })
      }
    }

    return baseWeekdays
  } catch {
    return [] // Invalid rule, task won't appear
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
