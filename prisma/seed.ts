import { PrismaClient, Role, Category, DishCategory } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Settings padrão
  await prisma.settings.createMany({
    data: [
      { key: 'house_name', value: '"Minha Casa"' },
      { key: 'printer_ip', value: '"192.168.1.230"' },
      { key: 'printer_type', value: '"EPSON"' },
      { key: 'app_pin', value: '"1234"' },
      { key: 'default_print_time', value: '"07:00"' },
    ],
    skipDuplicates: true,
  })
  console.log('Settings created')

  // Funcionário exemplo
  const employee = await prisma.employee.create({
    data: {
      name: 'Maria',
      role: Role.FAXINEIRA,
      workDays: [1, 2, 3, 4, 5], // Seg-Sex
    },
  })
  console.log('Employee created:', employee.name)

  // Tarefa exemplo
  await prisma.task.create({
    data: {
      title: 'Limpar cozinha',
      description: 'Limpar pia, fogão e bancadas',
      category: Category.LIMPEZA,
      rrule: 'FREQ=DAILY',
      employeeId: employee.id,
    },
  })
  console.log('Task created')

  // Prato exemplo
  await prisma.dish.create({
    data: {
      name: 'Arroz com feijão',
      category: DishCategory.ALMOCO,
      prepTime: 60,
      servings: 4,
      ingredients: ['Arroz', 'Feijão', 'Alho', 'Sal', 'Óleo'],
    },
  })
  console.log('Dish created')

  console.log('Seeding completed!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
