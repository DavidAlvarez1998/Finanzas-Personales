import { useState, useEffect } from 'react'

export function useDelayedUnmount(show: boolean, delay: number): boolean {
  const [shouldRender, setShouldRender] = useState(show)
  useEffect(() => {
    if (show) {
      setShouldRender(true)
    } else {
      const timer = setTimeout(() => setShouldRender(false), delay)
      return () => clearTimeout(timer)
    }
  }, [show, delay])
  return shouldRender
}
