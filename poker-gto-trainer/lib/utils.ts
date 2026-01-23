import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Round BB (Big Blind) values to avoid floating point precision issues
 * Rounds to 1 decimal place, or integer if the value is whole
 */
export function roundBB(value: number): number {
  // Round to 1 decimal place to avoid floating point issues
  const rounded = Math.round(value * 10) / 10;
  // If it's a whole number, return as integer (no .0)
  return rounded % 1 === 0 ? Math.round(rounded) : rounded;
}

/**
 * Format BB value for display (removes unnecessary decimals)
 */
export function formatBB(value: number): string {
  const rounded = roundBB(value);
  // If it's a whole number, show without decimals
  if (rounded % 1 === 0) {
    return Math.round(rounded).toString();
  }
  // Otherwise show 1 decimal place
  return rounded.toFixed(1);
}

