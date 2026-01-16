import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// utils/formatCellValue.js
export function formatCellValue(value : any) {
  // Handle null, undefined, or empty string
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  // If it's a number or numeric string → format with commas (Indian style)
  if (!isNaN(Number(value)) && value !== true && value !== false) {
    return Number(value).toLocaleString('en-IN');
  }

  // Otherwise → return as string
  return String(value);
}

// formatted string like "₹1,23,456"
export const formatCurrency = (value: number): string => {
  if (value === undefined || value === null) return "";
  return "₹" + value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};