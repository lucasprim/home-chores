# Implementation Tracker

> This file tracks implementation progress. Read this at the start of each session.

## Current Status

**Phase:** Phase 5 Complete - Special Tasks & Multi-page Printing
**Next Task:** None - All features implemented!
**Blocked:** No

## Implementation Plan

### Phase 1: Foundation
> Set up project skeleton, database, auth, and basic UI structure

- [x] Initialize Next.js 15 project with TypeScript
- [x] Configure Tailwind CSS
- [x] Set up Prisma with PostgreSQL schema
- [x] Create docker-compose.yml (app + postgres)
- [x] Create Dockerfile
- [x] Implement basic layout (header, nav, page container)
- [x] Implement PIN authentication (login page + middleware)
- [x] Create UI components (button, input, card, modal)

### Phase 2: Core Data
> Employees and settings - needed by other features

- [x] Employees list page
- [x] Employee create/edit form
- [x] Employee API routes (CRUD)
- [x] Settings page
- [x] Settings API routes
- [x] Printer test functionality

### Phase 3: Main Features
> Tasks, dashboard, and printing

- [x] Tasks list page
- [x] Task create/edit form with recurrence picker
- [x] Task API routes (CRUD)
- [x] Today dashboard page
- [x] Occurrences API (get by date, toggle completion)
- [x] Print page with preview
- [x] Print API (preview + execute)

### Phase 4: Additional Features
> Menu planning and automated printing

- [x] Dishes list page
- [x] Dish create/edit form
- [x] Dishes API routes
- [x] Meal calendar page
- [x] Meal schedule API routes
- [x] Randomize month functionality
- [x] Print jobs list page
- [x] Print job create/edit form
- [x] Print jobs API routes
- [x] Scheduler service (node-cron)

## Completed Work

### 2026-01-17: Fundamental Redesign - Print List Generator (not Task Tracker)
- **Major Refactoring**: System redesigned to be a print list generator, NOT a task tracker
- **Key Concept**: Recurrence (rrule) only determines which day a task appears in the print list
- **Removed**: All task completion tracking (TaskOccurrence, SpecialTaskOccurrence models)
- **Today Page**: Now read-only preview of what would be printed (no checkboxes)
- **Special Tasks**: Simplified - just tasks that print on own paper with due date info
- **Settings**: Added timezone setting (replaced default_print_time)
- Changes made:
  - Updated Prisma schema: removed TaskOccurrence, SpecialTaskOccurrence, SpecialTaskStatus
  - Updated Today page: removed completion toggling, now shows preview only
  - Created new `/api/tasks/for-date` endpoint that filters by rrule at runtime
  - Updated Print preview/execute to work directly with tasks (no occurrences)
  - Updated Scheduler to work directly with tasks (no occurrences)
  - Updated Settings page: added timezone selector (Brazilian timezones)
  - Deleted occurrence-based API routes and lib/special-tasks.ts
  - Updated all documentation (specifications, data-model, today.md, tasks.md)

### 2026-01-17: Bug Fix - Special Tasks Not Appearing on Today/Print
- **Problem**: Special tasks with daily recurrence weren't showing on Today or Print tabs
- **Root Cause**: Special task occurrences were only generated once at server startup, not on-demand when viewing a specific date
- **Fix**:
  - Created shared utility `lib/special-tasks.ts` for generating occurrences for any date
  - Today tab now generates occurrences for the selected date before fetching
  - Today tab now shows all special tasks that appeared on the selected date (not filtered to 3-day urgency)
  - Print preview API now generates occurrences for the selected date
  - Print preview API now filters by the selected date's `appearDate` (not TODAY+7 `dueDate`)
- Files changed:
  - `lib/special-tasks.ts` (new) - Shared occurrence generation utility
  - `app/api/special-tasks/occurrences/route.ts` - Added `appearDate` filter to GET, date param to POST
  - `app/(auth)/today/page.tsx` - Generate occurrences on-demand, fetch by appearDate
  - `app/api/print/preview/route.ts` - Generate occurrences and filter by selected date
  - `lib/scheduler.ts` - Refactored to use shared utility

### 2026-01-17: Special Tasks Refactor (Template/Occurrence Model)
- Special tasks now use a template/occurrence pattern:
  - **SpecialTask** is a template with rrule (when to generate) and dueDays (deadline after appearing)
  - **SpecialTaskOccurrence** is generated instance with appearDate, dueDate, and status
- Scheduler generates occurrences when rrule matches, calculates dueDate from dueDays
- Occurrences persist until completed or expired (past due date)
- Today page shows urgent special task occurrences (due within 3 days)
- Print includes pending occurrences (due within 7 days)
- Tasks page shows templates with pending occurrence count badge
- API routes:
  - /api/special-tasks - Template CRUD
  - /api/special-tasks/occurrences - List/generate occurrences
  - /api/special-tasks/occurrences/[id] - Update status (complete/extend)

### 2026-01-17: Special Tasks Integration (UI)
- Integrated special tasks into the main tasks page (removed separate /special-tasks page)
- Tasks page now has two tabs: "Recorrentes" and "Especiais"
- Task form supports creating both types with a toggle (Recorrente / Especial)
- Removed "Especiais" from navigation - all task management in one place

### 2026-01-17: Phase 4 - Print Jobs & Scheduler
- Print jobs list page with CRUD functionality
- Print job create/edit form with:
  - Name, type (daily tasks/weekly menu), employee filter
  - Time picker and days-of-week selector
  - Preset buttons (weekdays, all, clear)
  - Enable/disable toggle
- Print jobs API routes:
  - GET/POST /api/print-jobs
  - GET/PUT/DELETE /api/print-jobs/:id
  - POST /api/print-jobs/:id/run (execute job manually)
  - GET /api/print-jobs/:id/logs (execution history)
- Scheduler service (node-cron):
  - Auto-loads enabled jobs on server start
  - Syncs with database on job create/update/delete
  - Executes print jobs at configured times
  - Logs execution results (SUCCESS, FAILED, SKIPPED)
- Link from Print page to Print Jobs page

### 2026-01-17: Navigation Fix
- Added Settings icon (⚙️) to header for easy access
- Settings was previously hidden (bottom nav only showed 5 of 6 items)

### 2026-01-17: Phase 3 & 4 - All Core Features
- Tasks feature complete:
  - Tasks list page with filters (category, employee, search)
  - Task form with recurrence picker (daily, weekdays, weekly, monthly, custom RRULE)
  - Tasks API routes (CRUD) with rrule validation
  - RRule utilities library for parsing and formatting
- Today dashboard complete:
  - Shows tasks scheduled for selected date based on RRULE
  - Checks employee work days before showing tasks
  - Date navigation (prev/next day)
  - Task completion toggling with optimistic updates
  - Grouped by employee with progress counters
- Print feature complete:
  - Print page with preview (tasks or weekly menu)
  - Print API routes (preview + execute)
  - Thermal printer library with ESC/POS commands
  - Daily tasks and weekly menu print formats
- Menu feature complete:
  - Dishes list page with CRUD
  - Meal calendar with month navigation
  - Day edit modal for lunch/dinner selection
  - Randomize month functionality
  - Meal schedule API routes

### 2026-01-17: Phase 2 - Settings & Employees
- Created Employees list page with full CRUD functionality
- Employee cards showing name, role badge, work days
- Add/Edit modal with form (name, role, work days, active toggle)
- Delete confirmation modal
- Created Employee API routes (GET all, GET single, POST, PUT, DELETE)
- Added Badge UI component
- Settings page with house name, printer config, PIN change
- Printer test functionality (connection test + test page)
- Settings API routes (GET, PUT, PIN change, test printer)

### 2026-01-17: Phase 1 - Foundation
- Initialized Next.js 15 with TypeScript and App Router
- Configured Tailwind CSS v4 with PostCSS
- Set up Prisma 6 with complete PostgreSQL schema (employees, tasks, dishes, settings, print jobs)
- Created docker-compose.yml with app and postgres services
- Created multi-stage Dockerfile for production
- Implemented protected layout with header and bottom navigation
- Implemented PIN authentication with cookie-based sessions
- Created UI components: Button, Input, Card, Modal
- Created placeholder pages for all protected routes
- Project builds and runs successfully

### 2024-01-17: Specifications
- Created complete specifications in `specifications/`
- Documented all features, data model, API, and deployment

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | PostgreSQL | User preference, robust |
| Auth | Simple PIN | Local network only, low security needs |
| Language | PT-BR | User preference |
| Scheduler | node-cron | In-process, simpler than external cron |
| ORM | Prisma 6 | Type-safe, stable version (v7 had ESM issues) |
| Tailwind | v4 | Latest version with CSS-based config |
| Recurrence | rrule | Standard RFC 5545, flexible patterns |

## File Structure Reference

```
app/
├── (auth)/           # Protected routes
│   ├── today/        # Print preview for any date (read-only)
│   ├── tasks/        # Task management (recurring + special tasks with tabs)
│   ├── employees/    # Employee management
│   ├── menu/         # Meal planning calendar & dishes
│   ├── print/        # Manual printing
│   ├── print-jobs/   # Automated print jobs management
│   └── settings/     # App settings (house name, printer, timezone)
├── login/
└── api/
    ├── auth/         # Login/logout
    ├── employees/    # CRUD
    ├── tasks/        # CRUD (regular tasks)
    │   └── for-date/ # Get tasks for a specific date (filtered by rrule)
    ├── special-tasks/ # Special task CRUD
    ├── dishes/       # CRUD
    ├── meal-schedule/ # Calendar & randomize
    ├── print/        # Preview & execute
    ├── print-jobs/   # Print jobs CRUD, run, logs
    └── settings/     # Settings & printer test
lib/
├── prisma.ts         # Database client
├── printer.ts        # Thermal printer functions
├── rrule-utils.ts    # Recurrence rule utilities (includes isTaskScheduledForDate)
└── scheduler.ts      # node-cron scheduler for print jobs
instrumentation.ts    # Next.js server startup hook (initializes scheduler)
```

## Notes for Next Session

- Database is running via `DB_PASSWORD=homechores docker compose up -d db`
- Run `pnpm dev` to start the development server
- Default PIN is `1234` (configured in .env)
- All UI is in Portuguese (PT-BR)
- ALL features are complete - app is fully functional!
- Scheduler starts automatically when server starts (via instrumentation.ts)
- Print jobs can be accessed from Print page -> "Impressao Automatica" button

## How to Continue

1. Read this file to understand current status
2. Check the next uncompleted task in the current phase
3. Implement the task
4. Update this file marking the task complete
5. Add any notes or decisions made

## What's Working

> **Key Concept**: This is a PRINT LIST GENERATOR, not a task tracker. No completion tracking.

- **Employees**: Create, edit, delete employees with roles and work days
- **Tasks**: Create recurring tasks with flexible schedules (daily, weekdays, specific days, monthly)
- **Special Tasks**: Tasks that print on own paper with due date (integrated in Tasks page under "Especiais" tab)
- **Today**: Preview of what would be printed for any date (read-only, no completion tracking)
- **Print**: Preview and print daily tasks or weekly menu to thermal printer (multi-page with partial cuts)
- **Print Jobs**: Schedule automated printing with cron-like scheduling
- **Menu**: Plan meals with dish repertoire, calendar view, randomize feature
- **Settings**: Configure house name, printer IP, timezone, change PIN
