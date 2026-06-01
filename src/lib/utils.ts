import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Safely lower-case a nullable string (avoids `undefined.trim()` crashes). */
export function safeLowerCase(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

/** Human-readable expiration hint for pending share requests. */
export function formatExpirationHint(expiresAt: string | null | undefined): string {
  if (!expiresAt) return 'No expiration'
  const expires = new Date(expiresAt)
  const now = new Date()
  const msPerDay = 24 * 60 * 60 * 1000
  const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / msPerDay)

  if (daysLeft < 0) return 'Expired'
  if (daysLeft === 0) return 'Expires today'
  if (daysLeft === 1) return 'Expires tomorrow'
  return `Expires in ${daysLeft} days`
}

export function isExpiringSoon(expiresAt: string | null | undefined, withinDays = 3): boolean {
  if (!expiresAt) return false
  const expires = new Date(expiresAt)
  const now = new Date()
  const msPerDay = 24 * 60 * 60 * 1000
  const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / msPerDay)
  return daysLeft >= 0 && daysLeft <= withinDays
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateToken(): string {
  const cryptoObj = globalThis.crypto
  if (!cryptoObj?.getRandomValues) {
    throw new Error('Secure crypto unavailable for token generation')
  }
  const bytes = new Uint8Array(32)
  cryptoObj.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
