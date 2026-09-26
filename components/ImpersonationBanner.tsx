import type { ImpersonationContext } from '@/types'
import { stopImpersonation } from '@/app/admin/_actions'

interface Props {
  impersonation: ImpersonationContext
}

export function ImpersonationBanner({ impersonation }: Props) {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
      <span>
        Estás viendo como <strong>{impersonation.targetEmail}</strong>
      </span>
      <form action={stopImpersonation}>
        <button
          type="submit"
          className="rounded bg-amber-950/20 px-3 py-1 text-xs font-semibold hover:bg-amber-950/30 transition-colors"
        >
          Volver a mi cuenta
        </button>
      </form>
    </div>
  )
}
