// Geometry mirrors public/logo-source.svg — keep in sync when redesigning
import { memo } from 'react'

export interface LogoProps {
  /** Rendered pixel size (width == height). Default 32. */
  size?: number
  /** Extra classes for the outer <svg>. */
  className?: string
  /** aria-label; if omitted, svg is aria-hidden. */
  label?: string
}

function LogoImpl({ size = 32, className, label }: LogoProps) {
  const a11y = label
    ? { role: 'img' as const, 'aria-label': label }
    : { 'aria-hidden': true as const, focusable: false as const }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      {...a11y}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M 7.5 13.5 L 12 9 L 16.5 13.5"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-emerald-600 dark:stroke-emerald-500"
      />
    </svg>
  )
}

export const Logo = memo(LogoImpl)
