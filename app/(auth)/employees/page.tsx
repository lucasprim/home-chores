'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button, Card, CardContent, Badge, Modal, Input } from '@/components/ui'
import { Role } from '@prisma/client'

interface Employee {
  id: string
  name: string
  role: Role
  workDays: number[]
  active: boolean
}

const ROLE_LABELS: Record<Role, string> = {
  FAXINEIRA: 'Faxineira',
  COZINHEIRA: 'Cozinheira',
  BABA: 'Babá',
  JARDINEIRO: 'Jardineiro',
  MOTORISTA: 'Motorista',
  OUTRO: 'Outro',
}

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/employees')
      if (!res.ok) throw new Error('Erro ao carregar funcionários')
      const data = await res.json()
      setEmployees(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  const handleAdd = () => {
    setEditingEmployee(null)
    setIsModalOpen(true)
  }

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir funcionário')
      await fetchEmployees()
      setDeleteConfirmId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir')
    }
  }

  const handleFormSubmit = async () => {
    await fetchEmployees()
    setIsModalOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Funcionários</h1>
        <Button onClick={handleAdd}>+ Adicionar</Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-[var(--muted-foreground)]">Carregando...</div>
      ) : employees.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-[var(--muted-foreground)]">Nenhum funcionário cadastrado ainda.</p>
            <Button onClick={handleAdd} className="mt-4">
              Cadastrar primeiro funcionário
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {employees.map((employee) => (
            <Card key={employee.id} className={!employee.active ? 'opacity-60' : ''}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{employee.name}</span>
                    <Badge variant={employee.active ? 'default' : 'outline'}>
                      {ROLE_LABELS[employee.role]}
                    </Badge>
                    {!employee.active && <Badge variant="warning">Inativo</Badge>}
                  </div>
                  <div className="text-sm text-[var(--muted-foreground)] mt-1">
                    {employee.workDays.length === 0
                      ? 'Sem dias definidos'
                      : employee.workDays.map((d) => DAY_LABELS[d]).join(', ')}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(employee)}>
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirmId(employee.id)}
                  >
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}
      >
        <EmployeeForm
          employee={editingEmployee}
          onSuccess={handleFormSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      <Modal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Confirmar Exclusão"
      >
        <p className="mb-4">Tem certeza que deseja excluir este funcionário?</p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  )
}

interface EmployeeFormProps {
  employee: Employee | null
  onSuccess: () => void
  onCancel: () => void
}

function EmployeeForm({ employee, onSuccess, onCancel }: EmployeeFormProps) {
  const [name, setName] = useState(employee?.name ?? '')
  const [role, setRole] = useState<Role>(employee?.role ?? 'FAXINEIRA')
  const [workDays, setWorkDays] = useState<number[]>(employee?.workDays ?? [1, 2, 3, 4, 5])
  const [active, setActive] = useState(employee?.active ?? true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const url = employee ? `/api/employees/${employee.id}` : '/api/employees'
      const method = employee ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, workDays, active }),
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

  const toggleDay = (day: number) => {
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Nome</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do funcionário"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Função</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)]"
        >
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Dias de Trabalho</label>
        <div className="flex gap-1 flex-wrap">
          {DAY_LABELS.map((label, index) => (
            <button
              key={index}
              type="button"
              onClick={() => toggleDay(index)}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${
                  workDays.includes(index)
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                    : 'bg-[var(--secondary)] text-[var(--secondary-foreground)]'
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {employee && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="active"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="active" className="text-sm">
            Funcionário ativo
          </label>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : employee ? 'Salvar' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
