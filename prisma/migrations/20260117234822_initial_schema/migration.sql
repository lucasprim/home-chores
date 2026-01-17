-- CreateEnum
CREATE TYPE "role" AS ENUM ('FAXINEIRA', 'COZINHEIRA', 'BABA', 'JARDINEIRO', 'MOTORISTA', 'OUTRO');

-- CreateEnum
CREATE TYPE "category" AS ENUM ('LIMPEZA', 'COZINHA', 'LAVANDERIA', 'ORGANIZACAO', 'COMPRAS', 'MANUTENCAO', 'JARDIM', 'CRIANCAS', 'PETS', 'OUTRO');

-- CreateEnum
CREATE TYPE "dish_category" AS ENUM ('CAFE_MANHA', 'ALMOCO', 'JANTAR', 'LANCHE', 'SOBREMESA', 'BEBIDA');

-- CreateEnum
CREATE TYPE "meal_type" AS ENUM ('CAFE_MANHA', 'ALMOCO', 'JANTAR');

-- CreateEnum
CREATE TYPE "print_type" AS ENUM ('DAILY_TASKS', 'SINGLE_TASK', 'WEEKLY_MENU');

-- CreateEnum
CREATE TYPE "print_status" AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "role" NOT NULL,
    "workDays" INTEGER[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "category" NOT NULL,
    "rrule" TEXT NOT NULL,
    "employeeId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "special_tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "category" NOT NULL,
    "rrule" TEXT NOT NULL,
    "dueDays" INTEGER NOT NULL DEFAULT 7,
    "employeeId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "special_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dishes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "dish_category" NOT NULL,
    "prepTime" INTEGER,
    "servings" INTEGER,
    "ingredients" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dishes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_schedules" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "mealType" "meal_type" NOT NULL,
    "dishId" TEXT NOT NULL,
    "employeeId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_jobs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cronExpression" TEXT NOT NULL,
    "type" "print_type" NOT NULL,
    "employeeId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_logs" (
    "id" TEXT NOT NULL,
    "printJobId" TEXT,
    "status" "print_status" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "print_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_employeeId_idx" ON "tasks"("employeeId");

-- CreateIndex
CREATE INDEX "tasks_active_idx" ON "tasks"("active");

-- CreateIndex
CREATE INDEX "special_tasks_employeeId_idx" ON "special_tasks"("employeeId");

-- CreateIndex
CREATE INDEX "special_tasks_active_idx" ON "special_tasks"("active");

-- CreateIndex
CREATE INDEX "meal_schedules_date_idx" ON "meal_schedules"("date");

-- CreateIndex
CREATE UNIQUE INDEX "meal_schedules_date_mealType_key" ON "meal_schedules"("date", "mealType");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "print_logs_printJobId_idx" ON "print_logs"("printJobId");

-- CreateIndex
CREATE INDEX "print_logs_createdAt_idx" ON "print_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_tasks" ADD CONSTRAINT "special_tasks_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_schedules" ADD CONSTRAINT "meal_schedules_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "dishes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_schedules" ADD CONSTRAINT "meal_schedules_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_logs" ADD CONSTRAINT "print_logs_printJobId_fkey" FOREIGN KEY ("printJobId") REFERENCES "print_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
