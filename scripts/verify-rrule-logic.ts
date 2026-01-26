/**
 * Comprehensive verification script for rrule parsing logic
 * Run with: npx tsx scripts/verify-rrule-logic.ts
 */

import { RRule } from 'rrule'
import {
  isTaskScheduledForDate,
  getScheduledWeekdays,
  rruleToReadable,
  parseRuleToPreset,
  createDailyRule,
  createWeekdaysRule,
  createWeeklyRule,
  createMonthlyRule,
} from '../lib/rrule-utils'

// Test utilities
let testsPassed = 0
let testsFailed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    testsPassed++
    console.log(`✅ ${name}`)
  } catch (e) {
    testsFailed++
    console.log(`❌ ${name}`)
    console.log(`   Error: ${e instanceof Error ? e.message : e}`)
  }
}

function assertEqual<T>(actual: T, expected: T, msg?: string) {
  const actualStr = JSON.stringify(actual)
  const expectedStr = JSON.stringify(expected)
  if (actualStr !== expectedStr) {
    throw new Error(`${msg || 'Assertion failed'}: expected ${expectedStr}, got ${actualStr}`)
  }
}

function assertArrayEqual(actual: number[], expected: number[], msg?: string) {
  const sortedActual = [...actual].sort((a, b) => a - b)
  const sortedExpected = [...expected].sort((a, b) => a - b)
  assertEqual(sortedActual, sortedExpected, msg)
}

// ============================================================================
// TEST 1: Day-of-week mapping consistency
// ============================================================================
console.log('\n=== TEST GROUP 1: Day-of-week mapping consistency ===\n')

// JavaScript: Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6
// RRule:     Monday=0, Tuesday=1, Wednesday=2, Thursday=3, Friday=4, Saturday=5, Sunday=6

test('BYDAY=MO should match JS day 1 (Monday)', () => {
  const rule = 'FREQ=WEEKLY;BYDAY=MO'
  const monday = new Date(2026, 0, 26) // Jan 26, 2026 is a Monday
  assertEqual(monday.getDay(), 1, 'Test date should be Monday')
  assertEqual(isTaskScheduledForDate(rule, monday), true)

  const tuesday = new Date(2026, 0, 27)
  assertEqual(isTaskScheduledForDate(rule, tuesday), false)
})

test('BYDAY=SU should match JS day 0 (Sunday)', () => {
  const rule = 'FREQ=WEEKLY;BYDAY=SU'
  const sunday = new Date(2026, 1, 1) // Feb 1, 2026 is a Sunday
  assertEqual(sunday.getDay(), 0, 'Test date should be Sunday')
  assertEqual(isTaskScheduledForDate(rule, sunday), true)

  const monday = new Date(2026, 1, 2)
  assertEqual(isTaskScheduledForDate(rule, monday), false)
})

test('BYDAY=SA should match JS day 6 (Saturday)', () => {
  const rule = 'FREQ=WEEKLY;BYDAY=SA'
  const saturday = new Date(2026, 0, 31) // Jan 31, 2026 is a Saturday
  assertEqual(saturday.getDay(), 6, 'Test date should be Saturday')
  assertEqual(isTaskScheduledForDate(rule, saturday), true)
})

test('getScheduledWeekdays converts RRule days to JS days correctly', () => {
  // Monday only
  assertArrayEqual(getScheduledWeekdays('FREQ=WEEKLY;BYDAY=MO'), [1])
  // Sunday only
  assertArrayEqual(getScheduledWeekdays('FREQ=WEEKLY;BYDAY=SU'), [0])
  // Saturday only
  assertArrayEqual(getScheduledWeekdays('FREQ=WEEKLY;BYDAY=SA'), [6])
  // Mon, Wed, Fri
  assertArrayEqual(getScheduledWeekdays('FREQ=WEEKLY;BYDAY=MO,WE,FR'), [1, 3, 5])
  // Weekdays
  assertArrayEqual(getScheduledWeekdays('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'), [1, 2, 3, 4, 5])
})

// ============================================================================
// TEST 2: Fast path vs slow path consistency
// ============================================================================
console.log('\n=== TEST GROUP 2: Fast path vs slow path consistency ===\n')

test('Daily rule: fast path matches slow path behavior', () => {
  const rule = 'FREQ=DAILY'
  // Test every day of week
  for (let i = 0; i < 7; i++) {
    const date = new Date(2026, 0, 25 + i) // Jan 25 is Sunday
    assertEqual(isTaskScheduledForDate(rule, date), true, `Day ${i}`)
  }
  assertArrayEqual(getScheduledWeekdays(rule), [0, 1, 2, 3, 4, 5, 6])
})

test('Weekdays rule: fast path matches slow path behavior', () => {
  const rule = 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'

  // Jan 25, 2026 is Sunday (should be false)
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 25)), false, 'Sunday')
  // Jan 26-30 are Mon-Fri (should be true)
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 26)), true, 'Monday')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 27)), true, 'Tuesday')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 28)), true, 'Wednesday')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 29)), true, 'Thursday')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 30)), true, 'Friday')
  // Jan 31 is Saturday (should be false)
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 31)), false, 'Saturday')

  assertArrayEqual(getScheduledWeekdays(rule), [1, 2, 3, 4, 5])
})

test('Simple weekly rule: fast path (regex) matches slow path', () => {
  const rule = 'FREQ=WEEKLY;BYDAY=TU,TH'

  // Test all days
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 25)), false, 'Sunday')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 26)), false, 'Monday')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 27)), true, 'Tuesday')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 28)), false, 'Wednesday')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 29)), true, 'Thursday')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 30)), false, 'Friday')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 31)), false, 'Saturday')

  assertArrayEqual(getScheduledWeekdays(rule), [2, 4])
})

// ============================================================================
// TEST 3: Monthly rules
// ============================================================================
console.log('\n=== TEST GROUP 3: Monthly rules ===\n')

test('Monthly rule on day 15: isTaskScheduledForDate works correctly', () => {
  const rule = 'FREQ=MONTHLY;BYMONTHDAY=15'

  // Jan 15 should be scheduled
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 15)), true, 'Jan 15')
  // Jan 14 and 16 should not
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 14)), false, 'Jan 14')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 16)), false, 'Jan 16')
  // Feb 15 should be scheduled
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 1, 15)), true, 'Feb 15')
})

test('Monthly rule: getScheduledWeekdays returns correct day for specific week', () => {
  const rule = 'FREQ=MONTHLY;BYMONTHDAY=15'

  // Week of Jan 12-18, 2026 (Monday Jan 12 to Sunday Jan 18)
  // Jan 15 is a Thursday (JS day 4)
  const weekStart = new Date(2026, 0, 12) // Monday
  const weekdays = getScheduledWeekdays(rule, weekStart, null)
  assertArrayEqual(weekdays, [4], 'Jan 15 is Thursday (day 4)')

  // Week of Jan 19-25, 2026 - no day 15
  const weekStart2 = new Date(2026, 0, 19)
  const weekdays2 = getScheduledWeekdays(rule, weekStart2, null)
  assertArrayEqual(weekdays2, [], 'No monthly occurrence in this week')
})

test('Monthly rule: consistency between isTaskScheduledForDate and getScheduledWeekdays', () => {
  const rule = 'FREQ=MONTHLY;BYMONTHDAY=28'

  // Week of Jan 26 - Feb 1, 2026 (Monday to Sunday)
  // Jan 28 is a Wednesday (JS day 3)
  const weekStart = new Date(2026, 0, 26) // Monday Jan 26

  // Check each day of the week
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)

    const isScheduled = isTaskScheduledForDate(rule, date)
    const scheduledWeekdays = getScheduledWeekdays(rule, weekStart, null)
    const dayOfWeek = date.getDay()
    const shouldBeInWeekdays = scheduledWeekdays.includes(dayOfWeek)

    assertEqual(isScheduled, shouldBeInWeekdays,
      `Day ${date.toISOString().split('T')[0]} (dow=${dayOfWeek}): ` +
      `isScheduled=${isScheduled}, inWeekdays=${shouldBeInWeekdays}`)
  }
})

// ============================================================================
// TEST 4: Interval-based daily rules
// ============================================================================
console.log('\n=== TEST GROUP 4: Interval-based daily rules ===\n')

test('Every 3 days: isTaskScheduledForDate works correctly', () => {
  const rule = 'FREQ=DAILY;INTERVAL=3'
  const startDate = new Date(2026, 0, 1) // Start on Jan 1

  // From Jan 1: Jan 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 1), startDate), true, 'Jan 1')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 2), startDate), false, 'Jan 2')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 3), startDate), false, 'Jan 3')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 4), startDate), true, 'Jan 4')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 7), startDate), true, 'Jan 7')
})

test('Every 3 days: getScheduledWeekdays calculates correct days for week', () => {
  const rule = 'FREQ=DAILY;INTERVAL=3'
  const startDate = new Date(2026, 0, 1) // Start on Jan 1

  // Week of Jan 5-11, 2026 (Monday to Sunday)
  // Occurrences from Jan 1 every 3 days: 1, 4, 7, 10...
  // In this week: Jan 7 (Wednesday, dow=3) and Jan 10 (Saturday, dow=6)
  const weekStart = new Date(2026, 0, 5) // Monday Jan 5
  const weekdays = getScheduledWeekdays(rule, weekStart, startDate)
  assertArrayEqual(weekdays, [3, 6], 'Jan 7 (Wed) and Jan 10 (Sat)')
})

// ============================================================================
// TEST 5: startDate filtering
// ============================================================================
console.log('\n=== TEST GROUP 5: startDate filtering ===\n')

test('Task with startDate: not scheduled before start', () => {
  const rule = 'FREQ=DAILY'
  const startDate = new Date(2026, 0, 15) // Task starts Jan 15

  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 14), startDate), false, 'Jan 14 (before start)')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 15), startDate), true, 'Jan 15 (start date)')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 16), startDate), true, 'Jan 16 (after start)')
})

test('getScheduledWeekdays: filters days before startDate within week', () => {
  const rule = 'FREQ=DAILY'
  const startDate = new Date(2026, 0, 28) // Task starts Wed Jan 28
  const weekStart = new Date(2026, 0, 26) // Monday Jan 26

  // Task should only appear Wed (3), Thu (4), Fri (5), Sat (6), Sun (0)
  const weekdays = getScheduledWeekdays(rule, weekStart, startDate)
  assertArrayEqual(weekdays, [0, 3, 4, 5, 6], 'Only Wed-Sun')
})

test('getScheduledWeekdays: returns empty if task starts after week', () => {
  const rule = 'FREQ=DAILY'
  const startDate = new Date(2026, 1, 5) // Task starts Feb 5
  const weekStart = new Date(2026, 0, 26) // Week of Jan 26

  const weekdays = getScheduledWeekdays(rule, weekStart, startDate)
  assertArrayEqual(weekdays, [], 'Task starts after this week')
})

// ============================================================================
// TEST 6: Edge cases
// ============================================================================
console.log('\n=== TEST GROUP 6: Edge cases ===\n')

test('Invalid rrule string returns false/empty', () => {
  assertEqual(isTaskScheduledForDate('INVALID', new Date()), false)
  assertArrayEqual(getScheduledWeekdays('INVALID'), [])
})

test('Empty rrule string returns false/empty', () => {
  assertEqual(isTaskScheduledForDate('', new Date()), false)
  assertArrayEqual(getScheduledWeekdays(''), [])
})

test('RRULE: prefix is handled correctly', () => {
  const withPrefix = 'RRULE:FREQ=DAILY'
  const withoutPrefix = 'FREQ=DAILY'

  const date = new Date(2026, 0, 15)
  assertEqual(isTaskScheduledForDate(withPrefix, date), isTaskScheduledForDate(withoutPrefix, date))
  assertArrayEqual(getScheduledWeekdays(withPrefix), getScheduledWeekdays(withoutPrefix))
})

test('Monthly rule on day 31: handles short months', () => {
  const rule = 'FREQ=MONTHLY;BYMONTHDAY=31'

  // Jan 31 exists
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 31)), true, 'Jan 31')
  // Feb 31 doesn't exist - Feb 28 should not match
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 1, 28)), false, 'Feb 28')
  // March 31 exists
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 2, 31)), true, 'Mar 31')
})

test('Yearly rule: only matches on specific date', () => {
  const rule = 'FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=15' // March 15 every year

  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 2, 15)), true, 'Mar 15, 2026')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 2, 14)), false, 'Mar 14, 2026')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 3, 15)), false, 'Apr 15, 2026')
})

test('Yearly rule: getScheduledWeekdays returns correct day for specific week', () => {
  const rule = 'FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=28' // Jan 28 every year

  // Week of Jan 26 - Feb 1, 2026
  // Jan 28 is a Wednesday (JS day 3)
  const weekStart = new Date(2026, 0, 26)
  const weekdays = getScheduledWeekdays(rule, weekStart, null)
  assertArrayEqual(weekdays, [3], 'Jan 28 is Wednesday')

  // Week of Feb 2-8 - no Jan 28
  const weekStart2 = new Date(2026, 1, 2)
  const weekdays2 = getScheduledWeekdays(rule, weekStart2, null)
  assertArrayEqual(weekdays2, [], 'No yearly occurrence in Feb week')
})

// ============================================================================
// TEST 7: Create functions produce valid rules
// ============================================================================
console.log('\n=== TEST GROUP 7: Create functions ===\n')

test('createDailyRule produces working rule', () => {
  const rule = createDailyRule()
  assertEqual(rule, 'FREQ=DAILY')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 15)), true)
})

test('createWeekdaysRule produces working rule', () => {
  const rule = createWeekdaysRule()
  assertEqual(rule, 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 26)), true, 'Monday')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 25)), false, 'Sunday')
})

test('createWeeklyRule produces working rule', () => {
  // Input is RRule-style: 0=Mon, 1=Tue, etc.
  const rule = createWeeklyRule([0, 2, 4]) // Mon, Wed, Fri
  assertEqual(rule, 'FREQ=WEEKLY;BYDAY=MO,WE,FR')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 26)), true, 'Monday')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 28)), true, 'Wednesday')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 27)), false, 'Tuesday')
})

test('createMonthlyRule produces working rule', () => {
  const rule = createMonthlyRule(15)
  assertEqual(rule, 'FREQ=MONTHLY;BYMONTHDAY=15')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 15)), true, 'Jan 15')
  assertEqual(isTaskScheduledForDate(rule, new Date(2026, 0, 16)), false, 'Jan 16')
})

// ============================================================================
// TEST 8: parseRuleToPreset and rruleToReadable consistency
// ============================================================================
console.log('\n=== TEST GROUP 8: parseRuleToPreset consistency ===\n')

test('parseRuleToPreset returns correct type for daily', () => {
  const result = parseRuleToPreset('FREQ=DAILY')
  assertEqual(result.type, 'daily')
})

test('parseRuleToPreset returns correct type for weekdays', () => {
  const result = parseRuleToPreset('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR')
  assertEqual(result.type, 'weekdays')
})

test('parseRuleToPreset returns correct days for weekly', () => {
  const result = parseRuleToPreset('FREQ=WEEKLY;BYDAY=MO,WE,FR')
  assertEqual(result.type, 'weekly')
  // Note: parseRuleToPreset returns RRule-style days (0=Mon)
  assertArrayEqual(result.days || [], [0, 2, 4])
})

test('parseRuleToPreset returns correct monthDay for monthly', () => {
  const result = parseRuleToPreset('FREQ=MONTHLY;BYMONTHDAY=15')
  assertEqual(result.type, 'monthly')
  assertEqual(result.monthDay, 15)
})

test('rruleToReadable returns correct Portuguese text', () => {
  assertEqual(rruleToReadable('FREQ=DAILY'), 'Diariamente')
  assertEqual(rruleToReadable('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'), 'Dias úteis')
  assertEqual(rruleToReadable('FREQ=MONTHLY;BYMONTHDAY=15'), 'Todo dia 15 do mês')
  assertEqual(rruleToReadable('FREQ=DAILY;INTERVAL=3'), 'A cada 3 dias')
})

// ============================================================================
// TEST 9: Cross-function consistency for the SAME rule
// ============================================================================
console.log('\n=== TEST GROUP 9: Cross-function consistency ===\n')

function verifyConsistency(ruleName: string, rule: string, weekStart: Date) {
  test(`${ruleName}: isTaskScheduledForDate and getScheduledWeekdays are consistent`, () => {
    const scheduledWeekdays = getScheduledWeekdays(rule, weekStart, null)

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)

      const isScheduled = isTaskScheduledForDate(rule, date)
      const dayOfWeek = date.getDay()
      const shouldBeInWeekdays = scheduledWeekdays.includes(dayOfWeek)

      if (isScheduled !== shouldBeInWeekdays) {
        throw new Error(
          `Inconsistency on ${date.toISOString().split('T')[0]} (dow=${dayOfWeek}): ` +
          `isTaskScheduledForDate=${isScheduled}, getScheduledWeekdays contains ${dayOfWeek}=${shouldBeInWeekdays}\n` +
          `scheduledWeekdays = [${scheduledWeekdays.join(', ')}]`
        )
      }
    }
  })
}

const testWeek = new Date(2026, 0, 26) // Monday Jan 26, 2026

verifyConsistency('Daily', 'FREQ=DAILY', testWeek)
verifyConsistency('Weekdays', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', testWeek)
verifyConsistency('Mon/Wed/Fri', 'FREQ=WEEKLY;BYDAY=MO,WE,FR', testWeek)
verifyConsistency('Tue/Thu', 'FREQ=WEEKLY;BYDAY=TU,TH', testWeek)
verifyConsistency('Weekend', 'FREQ=WEEKLY;BYDAY=SA,SU', testWeek)
verifyConsistency('Monthly day 28', 'FREQ=MONTHLY;BYMONTHDAY=28', testWeek)
verifyConsistency('Monthly day 15', 'FREQ=MONTHLY;BYMONTHDAY=15', new Date(2026, 0, 12))
verifyConsistency('Every 2 days', 'FREQ=DAILY;INTERVAL=2', testWeek)

// ============================================================================
// TEST 10: Specific bug scenario - Monthly task showing all days
// ============================================================================
console.log('\n=== TEST GROUP 10: Monthly task bug scenario ===\n')

test('Monthly task should NOT appear on all days in weekly view', () => {
  // This was the reported bug: monthly task showing every day in weekly view
  const rule = 'FREQ=MONTHLY;BYMONTHDAY=15'

  // Week that CONTAINS day 15 (Jan 12-18, 2026)
  const weekWithDay15 = new Date(2026, 0, 12) // Monday Jan 12
  const daysWithTask = getScheduledWeekdays(rule, weekWithDay15, null)

  // Should only contain Thursday (day 4), not all days
  if (daysWithTask.length !== 1) {
    throw new Error(`Expected 1 day, got ${daysWithTask.length} days: [${daysWithTask.join(', ')}]`)
  }
  assertEqual(daysWithTask[0], 4, 'Jan 15 is Thursday (JS day 4)')

  // Week that does NOT contain day 15 (Jan 19-25, 2026)
  const weekWithoutDay15 = new Date(2026, 0, 19) // Monday Jan 19
  const daysWithoutTask = getScheduledWeekdays(rule, weekWithoutDay15, null)

  // Should be empty
  assertArrayEqual(daysWithoutTask, [], 'No monthly occurrence in week of Jan 19-25')
})

test('Monthly task: weekly view should match daily view for each day', () => {
  const rule = 'FREQ=MONTHLY;BYMONTHDAY=20'
  const weekStart = new Date(2026, 0, 19) // Monday Jan 19 (week contains Jan 20)

  const scheduledWeekdays = getScheduledWeekdays(rule, weekStart, null)

  // Check each day of the week
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    const dow = date.getDay()

    const dailyViewShows = isTaskScheduledForDate(rule, date)
    const weeklyViewShows = scheduledWeekdays.includes(dow)

    if (dailyViewShows !== weeklyViewShows) {
      throw new Error(
        `Mismatch on ${date.toISOString().split('T')[0]} (day ${date.getDate()}, dow=${dow}):\n` +
        `  Daily view: ${dailyViewShows}\n` +
        `  Weekly view: ${weeklyViewShows}\n` +
        `  scheduledWeekdays = [${scheduledWeekdays.join(', ')}]`
      )
    }
  }
})

test('Day mapping summary (documentation verification)', () => {
  // JS Date.getDay():  0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  // RRule byweekday:   0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun

  // Verify isTaskScheduledForDate uses JS-style
  const sundayRule = 'FREQ=WEEKLY;BYDAY=SU' // RRule Sunday
  const sunday = new Date(2026, 1, 1) // Feb 1, 2026 is Sunday (JS day 0)
  assertEqual(sunday.getDay(), 0, 'Feb 1 should be JS day 0 (Sunday)')
  assertEqual(isTaskScheduledForDate(sundayRule, sunday), true, 'Sunday rule should match Sunday date')

  // Verify getScheduledWeekdays returns JS-style
  const weekdays = getScheduledWeekdays(sundayRule)
  assertEqual(weekdays.includes(0), true, 'getScheduledWeekdays should return 0 (JS Sunday) for SU rule')
  assertEqual(weekdays.includes(6), false, 'getScheduledWeekdays should NOT return 6 for SU rule')

  // Verify the conversion in getScheduledWeekdays is correct for all days
  const allDaysRule = 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA,SU'
  const allDaysResult = getScheduledWeekdays(allDaysRule)
  assertArrayEqual(allDaysResult, [0, 1, 2, 3, 4, 5, 6], 'All days should be represented in JS-style')
})

// ============================================================================
// Summary
// ============================================================================
console.log('\n' + '='.repeat(60))
console.log(`\nTest Results: ${testsPassed} passed, ${testsFailed} failed`)
console.log('')

if (testsFailed > 0) {
  process.exit(1)
}
