import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--foreground)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full h-10 px-3 rounded-lg border border-[var(--border)]
            bg-[var(--background)] text-[var(--foreground)]
            placeholder:text-[var(--muted-foreground)]
            focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-[var(--destructive)]' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-sm text-[var(--destructive)]">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
