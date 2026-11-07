/**
 * Category identity palette. 12 hex values chosen for:
 *   - mutual distinctness (hue gaps ~30°, mixed saturation/lightness)
 *   - legibility on both light (#ffffff) and dark (#18181b) surfaces
 *   - visual kinship with the app's Tailwind palette (indigo/emerald/rose/amber/...)
 *
 * NOT exported via CSS variables: these express identity (which category), not
 * semantic meaning (income vs expense). Keep separate from --color-income / --color-expense.
 *
 * Overflow: more than 12 categories wraps (i % 12). `groupByCategory` currently
 * slices to top 8, so overflow is theoretical.
 */
export const CATEGORY_COLORS: readonly string[] = [
  '#6366f1', // indigo-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#f43f5e', // rose-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#a78bfa', // purple-400
] as const
