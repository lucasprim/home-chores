'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      if (res.ok) {
        router.push('/today')
        router.refresh()
      } else {
        setError('PIN incorreto')
        setPin('')
      }
    } catch {
      setError('Erro ao conectar')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (digit: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit)
    }
  }

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-8">Home Chores</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-center">
              Digite o PIN
            </label>
            <div className="flex justify-center gap-2 mb-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-12 h-12 border-2 border-[var(--border)] rounded-lg flex items-center justify-center text-2xl font-bold"
                >
                  {pin[i] ? '•' : ''}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-[var(--destructive)] text-sm text-center">{error}</p>
          )}

          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '←'].map(
              (digit, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (digit === '←') {
                      handleBackspace()
                    } else if (digit) {
                      handleKeyPress(digit)
                    }
                  }}
                  disabled={!digit}
                  className={`h-14 text-xl font-semibold rounded-lg transition-colors ${
                    digit
                      ? 'bg-[var(--secondary)] hover:bg-[var(--muted)] active:scale-95'
                      : 'invisible'
                  }`}
                >
                  {digit}
                </button>
              )
            )}
          </div>

          <button
            type="submit"
            disabled={pin.length < 4 || loading}
            className="w-full h-12 bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
