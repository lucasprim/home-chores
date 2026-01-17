import { HTMLAttributes, forwardRef } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--primary)] text-[var(--primary-foreground)]',
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  destructive: 'bg-[var(--destructive)] text-[var(--destructive-foreground)]',
  outline: 'border border-[var(--border)] text-[var(--foreground)]',
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
          ${variantStyles[variant]}
          ${className}
        `}
        {...props}
      />
    )
  }
)

Badge.displayName = 'Badge'
