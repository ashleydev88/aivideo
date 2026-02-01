import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculates the relative luminance of a hex color.
 * Returns a value between 0 (black) and 1 (white).
 */
export function getLuminance(hex: string): number {
  if (!hex || !hex.startsWith('#')) return 0;

  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  // Use the standard luminance formula for sRGB
  const a = [r, g, b].map(v => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Determines if a color is "light" based on its luminance.
 */
export function isLightColor(color: string | undefined, threshold = 0.6): boolean {
  if (!color) return false;
  const luminance = getLuminance(color);
  return luminance > threshold;
}
