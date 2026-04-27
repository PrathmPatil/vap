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

// "2026-04-10T22:49:45.000Z" return dateand time both in "10 Apr 2026, 11:19 PM" format
export const formatDate = (value: string): string => {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// "2026-04-10T22:49:45.000Z" return date in "10 Apr 2026" format
export const formatDateOnly = (value: string): string => {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// "2026-04-10T22:49:45.000Z" return time in "11:19 PM" format
export const formatTimeOnly = (value: string): string => {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};