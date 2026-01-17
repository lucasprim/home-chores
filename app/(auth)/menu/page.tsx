'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardHeader, CardTitle, CardContent, Modal, Input, Badge } from '@/components/ui'
import { DishCategory, MealType, Role } from '@prisma/client'

interface Dish {
  id: string
  name: string
  description: string | null
  category: DishCategory
  prepTime: number | null
  servings: number | null
  ingredients: string[]
  active: boolean
}

interface MealSchedule {
  id: string
  date: string
  mealType: MealType
  dish: { id: string; name: string; category: DishCategory }
  employee: { id: string; name: string } | null
  notes: string | null
}

interface Employee {
  id: string
  name: string
  role: Role
}

const DISH_CATEGORY_LABELS: Record<DishCategory, string> = {
  CAFE_MANHA: 'Café da manhã',
  ALMOCO: 'Almoço',
  JANTAR: 'Jantar',
  LANCHE: 'Lanche',
  SOBREMESA: 'Sobremesa',
  BEBIDA: 'Bebida',
}

const DISH_CATEGORY_ICONS: Record<DishCategory, string> = {
  CAFE_MANHA: '☕',
  ALMOCO: '🍚',
  JANTAR: '🍲',
  LANCHE: '🥪',
  SOBREMESA: '🍰',
  BEBIDA: '🥤',
}

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  CAFE_MANHA: 'Café',
  ALMOCO: 'Almoço',
  JANTAR: 'Jantar',
}

type TabType = 'calendar' | 'dishes'

export default function MenuPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('calendar')
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const [schedules, setSchedules] = useState<MealSchedule[]>([])
  const [dishes, setDishes] = useState<Dish[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Calendar state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showDayModal, setShowDayModal] = useState(false)
  const [randomizing, setRandomizing] = useState(false)

  // Dishes state
  const [showDishModal, setShowDishModal] = useState(false)
  const [editingDish, setEditingDish] = useState<Dish | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const fetchSchedules = useCallback(async () => {
    try {
      const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`
      const res = await fetch(`/api/meal-schedule?month=${monthStr}`)
      if (!res.ok) throw new Error('Erro ao carregar cardápio')
      const data = await res.json()
      setSchedules(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }, [currentMonth])

  const fetchDishes = useCallback(async () => {
    try {
      const res = await fetch('/api/dishes')
      if (!res.ok) throw new Error('Erro ao carregar pratos')
      const data = await res.json()
      setDishes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }, [])

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees')
      if (res.ok) {
        const data = await res.json()
        setEmployees(data.filter((e: Employee & { active: boolean }) => e.active))
      }
    } catch {
      // Ignore
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchSchedules(), fetchDishes(), fetchEmployees()])
      setLoading(false)
    }
    load()
  }, [fetchSchedules, fetchDishes, fetchEmployees])

  const handleRandomize = async () => {
    try {
      setRandomizing(true)
      setError(null)

      const startDate = new Date(currentMonth)
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

      const res = await fetch('/api/meal-schedule/randomize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          mealTypes: ['ALMOCO', 'JANTAR'],
          overwrite: false,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSuccess(data.message)
      setTimeout(() => setSuccess(null), 3000)
      await fetchSchedules()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao randomizar')
    } finally {
      setRandomizing(false)
    }
  }

  const navigateMonth = (delta: number) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  const handleDayClick = (date: Date) => {
    setSelectedDate(date)
    setShowDayModal(true)
  }

  const handleDayModalClose = () => {
    setShowDayModal(false)
    setSelectedDate(null)
  }

  const handleDishSuccess = () => {
    fetchDishes()
    setShowDishModal(false)
    setEditingDish(null)
  }

  // Calendar rendering
  const monthDays = getMonthDays(currentMonth)
  const monthName = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const getScheduleForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return schedules.filter((s) => s.date.split('T')[0] === dateStr)
  }

  const filteredDishes = dishes.filter((d) => showInactive || d.active)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cardápio</h1>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'calendar' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab('calendar')}
          >
            Calendário
          </Button>
          <Button
            variant={activeTab === 'dishes' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab('dishes')}
          >
            Pratos
          </Button>
        </div>
      </div>

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

      {loading ? (
        <div className="text-center py-8 text-[var(--muted-foreground)]">Carregando...</div>
      ) : activeTab === 'calendar' ? (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigateMonth(-1)}>
                ←
              </Button>
              <span className="font-medium capitalize w-40 text-center">{monthName}</span>
              <Button variant="ghost" size="sm" onClick={() => navigateMonth(1)}>
                →
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleRandomize} disabled={randomizing}>
                {randomizing ? 'Randomizando...' : 'Randomizar mês'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/print?type=WEEKLY_MENU&date=${currentMonth.toISOString().split('T')[0]}`)}
              >
                Imprimir
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-2">
              <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                  <div key={day} className="py-2 font-medium text-[var(--muted-foreground)]">
                    {day}
                  </div>
                ))}
                {monthDays.map((date, index) => {
                  const daySchedules = date ? getScheduleForDay(date) : []
                  const isToday =
                    date && date.toDateString() === new Date().toDateString()
                  const lunch = daySchedules.find((s) => s.mealType === 'ALMOCO')
                  const dinner = daySchedules.find((s) => s.mealType === 'JANTAR')

                  return (
                    <div
                      key={index}
                      className={`
                        min-h-16 p-1 rounded-lg text-sm
                        ${date ? 'cursor-pointer hover:bg-[var(--secondary)]' : ''}
                        ${isToday ? 'bg-[var(--primary)] bg-opacity-10 border border-[var(--primary)]' : ''}
                      `}
                      onClick={() => date && handleDayClick(date)}
                    >
                      {date && (
                        <>
                          <div className={`font-medium ${isToday ? 'text-[var(--primary)]' : ''}`}>
                            {date.getDate()}
                          </div>
                          <div className="text-xs truncate">{lunch && '🍚'}</div>
                          <div className="text-xs truncate">{dinner && '🍲'}</div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <div className="text-sm text-[var(--muted-foreground)]">
            🍚 Almoço • 🍲 Jantar • Clique em um dia para editar
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4"
              />
              Mostrar inativos
            </label>
            <Button onClick={() => { setEditingDish(null); setShowDishModal(true) }}>
              + Novo Prato
            </Button>
          </div>

          {filteredDishes.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-[var(--muted-foreground)]">Nenhum prato cadastrado ainda.</p>
                <Button onClick={() => { setEditingDish(null); setShowDishModal(true) }} className="mt-4">
                  Cadastrar primeiro prato
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredDishes.map((dish) => (
                <Card key={dish.id} className={!dish.active ? 'opacity-60' : ''}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{DISH_CATEGORY_ICONS[dish.category]}</span>
                        <span className="font-medium truncate">{dish.name}</span>
                        <Badge variant={dish.active ? 'outline' : 'warning'}>
                          {DISH_CATEGORY_LABELS[dish.category]}
                        </Badge>
                        {!dish.active && <Badge variant="warning">Inativo</Badge>}
                      </div>
                      {(dish.prepTime || dish.servings) && (
                        <div className="text-sm text-[var(--muted-foreground)] mt-1">
                          {dish.prepTime && `${dish.prepTime} min`}
                          {dish.prepTime && dish.servings && ' • '}
                          {dish.servings && `${dish.servings} porções`}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setEditingDish(dish); setShowDishModal(true) }}
                    >
                      Editar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Modal open={showDayModal} onClose={handleDayModalClose} title={selectedDate ? formatDateTitle(selectedDate) : ''}>
        {selectedDate && (
          <DayEditForm
            date={selectedDate}
            schedules={getScheduleForDay(selectedDate)}
            dishes={dishes.filter((d) => d.active)}
            employees={employees}
            onSuccess={() => { handleDayModalClose(); fetchSchedules() }}
            onCancel={handleDayModalClose}
          />
        )}
      </Modal>

      <Modal
        open={showDishModal}
        onClose={() => { setShowDishModal(false); setEditingDish(null) }}
        title={editingDish ? 'Editar Prato' : 'Novo Prato'}
      >
        <DishForm
          dish={editingDish}
          onSuccess={handleDishSuccess}
          onCancel={() => { setShowDishModal(false); setEditingDish(null) }}
        />
      </Modal>
    </div>
  )
}

function formatDateTitle(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function getMonthDays(month: Date): (Date | null)[] {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDay = new Date(year, monthIndex, 1)
  const lastDay = new Date(year, monthIndex + 1, 0)
  const days: (Date | null)[] = []

  // Pad start
  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push(null)
  }

  // Days of month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, monthIndex, i))
  }

  return days
}

interface DayEditFormProps {
  date: Date
  schedules: MealSchedule[]
  dishes: Dish[]
  employees: Employee[]
  onSuccess: () => void
  onCancel: () => void
}

function DayEditForm({ date, schedules, dishes, employees, onSuccess, onCancel }: DayEditFormProps) {
  const lunchSchedule = schedules.find((s) => s.mealType === 'ALMOCO')
  const dinnerSchedule = schedules.find((s) => s.mealType === 'JANTAR')

  const [lunchDishId, setLunchDishId] = useState(lunchSchedule?.dish.id ?? '')
  const [dinnerDishId, setDinnerDishId] = useState(dinnerSchedule?.dish.id ?? '')
  const [lunchEmployeeId, setLunchEmployeeId] = useState(lunchSchedule?.employee?.id ?? '')
  const [dinnerEmployeeId, setDinnerEmployeeId] = useState(dinnerSchedule?.employee?.id ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lunchDishes = dishes.filter((d) => d.category === 'ALMOCO')
  const dinnerDishes = dishes.filter((d) => d.category === 'JANTAR')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const dateStr = date.toISOString().split('T')[0]

      const promises = []

      if (lunchDishId) {
        promises.push(
          fetch('/api/meal-schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: dateStr,
              mealType: 'ALMOCO',
              dishId: lunchDishId,
              employeeId: lunchEmployeeId || null,
            }),
          })
        )
      }

      if (dinnerDishId) {
        promises.push(
          fetch('/api/meal-schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: dateStr,
              mealType: 'JANTAR',
              dishId: dinnerDishId,
              employeeId: dinnerEmployeeId || null,
            }),
          })
        )
      }

      await Promise.all(promises)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-100 text-red-800 text-sm">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">🍚 Almoço</label>
        <select
          value={lunchDishId}
          onChange={(e) => setLunchDishId(e.target.value)}
          className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)]"
        >
          <option value="">(não definido)</option>
          {lunchDishes.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        {lunchDishId && (
          <select
            value={lunchEmployeeId}
            onChange={(e) => setLunchEmployeeId(e.target.value)}
            className="w-full h-10 px-3 mt-2 rounded-lg border border-[var(--border)] bg-[var(--background)]"
          >
            <option value="">Quem prepara: (não definido)</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">🍲 Jantar</label>
        <select
          value={dinnerDishId}
          onChange={(e) => setDinnerDishId(e.target.value)}
          className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)]"
        >
          <option value="">(não definido)</option>
          {dinnerDishes.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        {dinnerDishId && (
          <select
            value={dinnerEmployeeId}
            onChange={(e) => setDinnerEmployeeId(e.target.value)}
            className="w-full h-10 px-3 mt-2 rounded-lg border border-[var(--border)] bg-[var(--background)]"
          >
            <option value="">Quem prepara: (não definido)</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}

interface DishFormProps {
  dish: Dish | null
  onSuccess: () => void
  onCancel: () => void
}

function DishForm({ dish, onSuccess, onCancel }: DishFormProps) {
  const [name, setName] = useState(dish?.name ?? '')
  const [description, setDescription] = useState(dish?.description ?? '')
  const [category, setCategory] = useState<DishCategory>(dish?.category ?? 'ALMOCO')
  const [prepTime, setPrepTime] = useState(dish?.prepTime?.toString() ?? '')
  const [servings, setServings] = useState(dish?.servings?.toString() ?? '')
  const [ingredients, setIngredients] = useState(dish?.ingredients?.join('\n') ?? '')
  const [active, setActive] = useState(dish?.active ?? true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const url = dish ? `/api/dishes/${dish.id}` : '/api/dishes'
      const method = dish ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          category,
          prepTime: prepTime ? parseInt(prepTime) : null,
          servings: servings ? parseInt(servings) : null,
          ingredients: ingredients.split('\n').map((i) => i.trim()).filter(Boolean),
          active,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-100 text-red-800 text-sm">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Nome *</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Arroz com feijão"
          required
          maxLength={100}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Categoria *</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as DishCategory)}
          className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)]"
        >
          {Object.entries(DISH_CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {DISH_CATEGORY_ICONS[value as DishCategory]} {label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Tempo de preparo (min)</label>
          <Input
            type="number"
            value={prepTime}
            onChange={(e) => setPrepTime(e.target.value)}
            placeholder="60"
            min={1}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Porções</label>
          <Input
            type="number"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            placeholder="4"
            min={1}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Ingredientes (um por linha)</label>
        <textarea
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          placeholder="Arroz\nFeijão\nAlho\nSal"
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] resize-none"
          rows={4}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Descrição / Modo de preparo</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Opcional"
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] resize-none"
          rows={2}
          maxLength={1000}
        />
      </div>

      {dish && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="dish-active"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="dish-active" className="text-sm">Prato ativo</label>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : dish ? 'Salvar' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
