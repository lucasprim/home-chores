'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'

interface DropdownMenuItem {
  label: string
  onClick: () => void
  variant?: 'default' | 'destructive'
}

interface DropdownMenuProps {
  items: DropdownMenuItem[]
  children?: ReactNode
}

export function DropdownMenu({ items, children }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-md hover:bg-[var(--secondary)] transition-colors"
        aria-label="Menu"
      >
        {children || (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 min-w-[120px] py-1 rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-lg z-50">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.onClick()
                setIsOpen(false)
              }}
              className={`
                w-full px-3 py-2 text-left text-sm transition-colors
                hover:bg-[var(--secondary)]
                ${item.variant === 'destructive' ? 'text-[var(--destructive)]' : ''}
              `}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
