import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString('en-AU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function formatDelta(delta: number, unit = '', lowerIsBetter = false): { text: string; positive: boolean } {
  const positive = lowerIsBetter ? delta < 0 : delta > 0
  const sign = delta > 0 ? '+' : ''
  return { text: `${sign}${delta.toFixed(1)}${unit}`, positive }
}
