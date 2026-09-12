export interface FormatAmountOptions {
  decimals?: number
}

export function formatAmount(value: number, opts: FormatAmountOptions = {}): string {
  const decimals = opts.decimals ?? 2
  if (!Number.isFinite(value)) return '0,00'
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}
