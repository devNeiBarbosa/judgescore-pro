// Utility functions for the Championship Management System

// NOTE: validateCPF lives in lib/validation.ts (SINGLE SOURCE OF TRUTH)
// Re-exported here for backward compatibility only.
export { validateCPF } from './validation';

/**
 * Applies CPF mask: 000.000.000-00
 */
export function maskCPF(value: string): string {
  const clean = (value ?? '').replace(/\D/g, '').slice(0, 11);
  return clean
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/**
 * Applies phone mask: (00) 00000-0000 or (00) 0000-0000
 */
export function maskPhone(value: string): string {
  const clean = (value ?? '').replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 10) {
    return clean
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return clean
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

/**
 * Formats a number as BRL currency.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value ?? 0);
}

/**
 * Formats a date string to pt-BR locale.
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
  } catch {
    return '';
  }
}

/**
 * Generates a URL-friendly slug from a string.
 */
export function slugify(text: string): string {
  return (text ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

/**
 * Classname utility (replaces tailwind's cn)
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
