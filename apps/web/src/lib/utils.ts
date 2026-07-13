import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Format an already-major-unit amount (e.g. naira, not kobo) as currency.
 *
 * Backend amounts are stored/transmitted in minor units as bigint strings
 * (e.g. "50000000" kobo). Callers must convert minor -> major themselves
 * (via lib/api/transforms.ts#minorToMajor, or the mapping helpers that call
 * it) before passing a value here. This function does NOT divide by 100 -
 * doing so here as well as in the transform layer was double-converting
 * every amount in the app to 1/100th of its real value.
 */
export function formatMoney(
  amountMajorUnits: number,
  currency = 'NGN',
): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMajorUnits);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatPeriod(period: string): string {
  const [year, month] = period.split('-');
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(Number(year), Number(month) - 1));
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}
