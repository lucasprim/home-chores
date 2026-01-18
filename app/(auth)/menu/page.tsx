'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, Modal, Input, Badge } from '@/components/ui'
import { DishCategory, MealType } from '@prisma/client'

interface Dish {
  id: string
  name: string
  categories: DishCategory[]
  active: boolean
}

interface MealSchedule {
  id: string
  date: string
  mealType: MealType
  dish: { id: string; name: string; categories: DishCategory[] }
  notes: string | null
}

// All meal types in display order
const MEAL_TYPES: MealType[] = ['CAFE_MANHA', 'ALMOCO', 'JANTAR', 'LANCHE', 'SOBREMESA', 'BEBIDA']

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  CAFE_MANHA: 'Café da manhã',
  ALMOCO: 'Almoço',
  JANTAR: 'Jantar',
  LANCHE: 'Lanche',
  SOBREMESA: 'Sobremesa',
  BEBIDA: 'Bebida',
}

const MEAL_TYPE_ICONS: Record<MealType, string> = {
  CAFE_MANHA: '☕',
  ALMOCO: '🍚',
  JANTAR: '🍲',
  LANCHE: '🥪',
  SOBREMESA: '🍰',
  BEBIDA: '🥤',
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

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchSchedules(), fetchDishes()])
      setLoading(false)
    }
    load()
  }, [fetchSchedules, fetchDishes])

  const handleRandomize = async () => {
    try {
      setRandomizing(true)
      setError(null)

      const startDate = new Date(currentMonth)
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

      // Format dates as YYYY-MM-DD without timezone conversion
      const formatDate = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

      const res = await fetch('/api/meal-schedule/randomize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
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
    // Format date as YYYY-MM-DD without timezone conversion
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
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

                  return (
                    <div
                      key={index}
                      className={`
                        min-h-24 p-1 rounded-lg text-sm
                        ${date ? 'cursor-pointer hover:bg-[var(--secondary)]' : ''}
                        ${isToday ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-[var(--primary)]' : ''}
                      `}
                      onClick={() => date && handleDayClick(date)}
                    >
                      {date && (
                        <>
                          <div className={`font-medium ${isToday ? 'text-[var(--primary)]' : ''}`}>
                            {date.getDate()}
                          </div>
                          {MEAL_TYPES.map((mealType) => {
                            const schedule = daySchedules.find((s) => s.mealType === mealType)
                            if (!schedule) return null
                            return (
                              <div key={mealType} className="text-xs truncate" title={schedule.dish.name}>
                                {MEAL_TYPE_ICONS[mealType]} {schedule.dish.name}
                              </div>
                            )
                          })}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <div className="text-sm text-[var(--muted-foreground)]">
            {MEAL_TYPES.map((mt, i) => (
              <span key={mt}>
                {MEAL_TYPE_ICONS[mt]} {MEAL_TYPE_LABELS[mt]}
                {i < MEAL_TYPES.length - 1 ? ' • ' : ''}
              </span>
            ))}
            <span className="block mt-1">Clique em um dia para editar</span>
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{dish.name}</span>
                        {dish.categories.map((cat) => (
                          <Badge key={cat} variant="outline">
                            {DISH_CATEGORY_ICONS[cat]} {DISH_CATEGORY_LABELS[cat]}
                          </Badge>
                        ))}
                        {!dish.active && <Badge variant="warning">Inativo</Badge>}
                      </div>
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
  onSuccess: () => void
  onCancel: () => void
}

function DayEditForm({ date, schedules, dishes, onSuccess, onCancel }: DayEditFormProps) {
  // Initialize state with current schedule values for each meal type
  const [selectedDishes, setSelectedDishes] = useState<Record<MealType, string>>(() => {
    const initial: Record<MealType, string> = {} as Record<MealType, string>
    for (const mt of MEAL_TYPES) {
      const schedule = schedules.find((s) => s.mealType === mt)
      initial[mt] = schedule?.dish.id ?? ''
    }
    return initial
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get dishes that match a specific category (meal type maps to dish category)
  const getDishesForMealType = (mealType: MealType) => {
    // MealType and DishCategory have the same values
    return dishes.filter((d) => d.categories.includes(mealType as unknown as DishCategory))
  }

  const handleDishChange = (mealType: MealType, dishId: string) => {
    setSelectedDishes((prev) => ({ ...prev, [mealType]: dishId }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // Format date as YYYY-MM-DD without timezone conversion
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

      const promises = []

      for (const mealType of MEAL_TYPES) {
        const dishId = selectedDishes[mealType]
        if (dishId) {
          promises.push(
            fetch('/api/meal-schedule', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                date: dateStr,
                mealType,
                dishId,
              }),
            })
          )
        }
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

      {MEAL_TYPES.map((mealType) => {
        const availableDishes = getDishesForMealType(mealType)
        // Only show meal types that have dishes available
        if (availableDishes.length === 0) return null

        return (
          <div key={mealType}>
            <label className="block text-sm font-medium mb-1">
              {MEAL_TYPE_ICONS[mealType]} {MEAL_TYPE_LABELS[mealType]}
            </label>
            <select
              value={selectedDishes[mealType]}
              onChange={(e) => handleDishChange(mealType, e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)]"
            >
              <option value="">(não definido)</option>
              {availableDishes.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )
      })}

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

const DISH_CATEGORY_OPTIONS: DishCategory[] = ['CAFE_MANHA', 'ALMOCO', 'JANTAR', 'LANCHE', 'SOBREMESA', 'BEBIDA']

function DishForm({ dish, onSuccess, onCancel }: DishFormProps) {
  const [name, setName] = useState(dish?.name ?? '')
  const [categories, setCategories] = useState<DishCategory[]>(dish?.categories ?? [])
  const [active, setActive] = useState(dish?.active ?? true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleCategory = (category: DishCategory) => {
    setCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    if (categories.length === 0) {
      setError('Selecione pelo menos uma categoria')
      setSubmitting(false)
      return
    }

    try {
      const url = dish ? `/api/dishes/${dish.id}` : '/api/dishes'
      const method = dish ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          categories,
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
        <label className="block text-sm font-medium mb-2">Categorias *</label>
        <div className="flex flex-wrap gap-2">
          {DISH_CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className={`
                px-3 py-2 rounded-lg border text-sm transition-colors
                ${categories.includes(cat)
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                  : 'border-[var(--border)] hover:bg-[var(--secondary)]'
                }
              `}
            >
              {DISH_CATEGORY_ICONS[cat]} {DISH_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">
          Selecione todas as refeições em que este prato pode ser servido
        </p>
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
