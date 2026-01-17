# Home Chores

**Print list generator** for home tasks and meal planning with thermal printer integration.

> **IMPORTANT**: This is NOT a task tracker. It's a print list generator.
> - Recurrence (rrule) determines which day a task appears on the print list
> - There is NO completion tracking - no pending/doing/done states
> - The system decides what gets printed, not what has been done

## Quick Start for Claude

**To continue implementation:** Read `IMPLEMENTATION.md` for current status and next steps.

### IMPORTANT: Implementation Rules
1. **Before starting work:** Read `IMPLEMENTATION.md` to know current status
2. **After completing ANY task:** Update `IMPLEMENTATION.md` immediately - mark checkbox, add notes
3. **Never batch updates** - update the tracker after each individual task completion
4. **If session ends mid-task:** Note the partial progress in IMPLEMENTATION.md

## Package Manager
Use `pnpm` (not npm)

## Tech Stack
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- Docker

## Key Files
- `specifications/` - Complete app specifications
- `IMPLEMENTATION.md` - Implementation progress tracker
- `scripts/print-maid-tasks.ts` - Original thermal printer script (reference)

## Thermal Printer Config
- IP: 192.168.1.230
- Type: EPSON
- Paper: 80mm

## Implementation Status

- [x] All phases complete - app is fully functional
- [x] Employees, Tasks, Special Tasks, Today Preview, Print, Menu, Settings

See `IMPLEMENTATION.md` for detailed progress and recent changes.
