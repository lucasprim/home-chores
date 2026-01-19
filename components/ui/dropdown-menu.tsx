'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'

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
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, openUpward: false })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const menuHeight = items.length * 40 + 8
      const spaceBelow = window.innerHeight - rect.bottom
      const openUpward = spaceBelow < menuHeight

      setMenuPosition({
        top: openUpward ? rect.top - menuHeight : rect.bottom + 4,
        left: rect.right - 120, // 120px is min-width, align right edge
        openUpward,
      })
    }
    setIsOpen(!isOpen)
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="p-1.5 rounded-md hover:bg-[var(--secondary)] transition-colors"
        aria-label="Menu"
      >
        {children || (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        )}
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: menuPosition.top,
              left: menuPosition.left,
            }}
            className="min-w-[120px] py-1 rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-lg z-[9999]"
          >
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
          </div>,
          document.body
        )}
    </>
  )
}
