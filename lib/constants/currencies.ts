export interface Currency {
  code: string
  flag: string
  name: string
}

const FLAG_MAP: Record<string, string> = {}

export const WORLD_CURRENCIES: Currency[] = [
  { code: 'ARS', flag: '🇦🇷', name: 'Peso argentino' },
  { code: 'BOB', flag: '🇧🇴', name: 'Boliviano' },
  { code: 'BRL', flag: '🇧🇷', name: 'Real brasileño' },
  { code: 'CAD', flag: '🇨🇦', name: 'Dólar canadiense' },
  { code: 'CHF', flag: '🇨🇭', name: 'Franco suizo' },
  { code: 'CLP', flag: '🇨🇱', name: 'Peso chileno' },
  { code: 'CNY', flag: '🇨🇳', name: 'Yuan chino' },
  { code: 'COP', flag: '🇨🇴', name: 'Peso colombiano' },
  { code: 'EUR', flag: '🇪🇺', name: 'Euro' },
  { code: 'GBP', flag: '🇬🇧', name: 'Libra esterlina' },
  { code: 'GTQ', flag: '🇬🇹', name: 'Quetzal guatemalteco' },
  { code: 'HNL', flag: '🇭🇳', name: 'Lempira hondureño' },
  { code: 'JPY', flag: '🇯🇵', name: 'Yen japonés' },
  { code: 'MXN', flag: '🇲🇽', name: 'Peso mexicano' },
  { code: 'NIO', flag: '🇳🇮', name: 'Córdoba nicaragüense' },
  { code: 'PEN', flag: '🇵🇪', name: 'Sol peruano' },
  { code: 'PYG', flag: '🇵🇾', name: 'Guaraní paraguayo' },
  { code: 'USD', flag: '🇺🇸', name: 'Dólar estadounidense' },
  { code: 'UYU', flag: '🇺🇾', name: 'Peso uruguayo' },
  { code: 'VES', flag: '🇻🇪', name: 'Bolívar venezolano' },
]

WORLD_CURRENCIES.forEach(c => { FLAG_MAP[c.code] = c.flag })

export function currencyLabel(code: string): string {
  return code
}
