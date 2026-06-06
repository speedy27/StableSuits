import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function compactNumber(n: number, currency = ""): string {
  const fmt = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n)
  return currency ? `${currency}${fmt}` : fmt
}

export function fullNumber(n: number, currency = ""): string {
  const fmt = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(n)
  return currency ? `${currency}${fmt}` : fmt
}

export function pct(n: number, digits = 2): string {
  return `${(n * 100).toFixed(digits)}%`
}

export function relativeTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s ago`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h ago`
  return `${(seconds / 86400).toFixed(1)}d ago`
}

export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`
}
