/**
 * Centralized validation rules — SINGLE SOURCE OF TRUTH
 * Used by both server (API routes) and client (forms)
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates password strength.
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number (no simple sequences like 123, 456, 789)
 * - At least 1 special character (., @, !, #, $, %, etc.)
 *
 * Valid examples:   Stage@9Core, Iron!5Rank
 * Invalid examples: senha123, 12345678, ABC12345, senha@123
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push('Mínimo de 8 caracteres');
  }

  if (password.length > 128) {
    errors.push('Máximo de 128 caracteres');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Pelo menos 1 letra maiúscula');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Pelo menos 1 letra minúscula');
  }

  // Must have a digit
  if (!/\d/.test(password)) {
    errors.push('Pelo menos 1 número');
  }

  // Digit must NOT be part of a simple sequence (123, 234, 456, 789, etc.)
  const digits = password.replace(/\D/g, '');
  if (digits.length > 0 && isSimpleSequence(digits)) {
    errors.push('Números não podem ser sequências simples (ex: 123, 456)');
  }

  // Must have at least 1 special character
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Pelo menos 1 caractere especial (ex: @, !, #, $, %)');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Checks if all digits in the string form simple ascending/descending sequences.
 * e.g., "123" → true, "456" → true, "9" → false (single digit OK), "15" → false
 */
function isSimpleSequence(digits: string): boolean {
  if (digits.length <= 1) return false;

  // Check for ascending sequences (123, 234, etc.)
  let isAscending = true;
  let isDescending = true;

  for (let i = 1; i < digits.length; i++) {
    const diff = parseInt(digits[i]) - parseInt(digits[i - 1]);
    if (diff !== 1) isAscending = false;
    if (diff !== -1) isDescending = false;
  }

  return isAscending || isDescending;
}

/** Validate email format */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Remove HTML tags and trim — XSS prevention */
export function sanitizeInput(input: string): string {
  return (input ?? '').replace(/<[^>]*>/g, '').trim();
}

/** Validate birthDate is a real past date, 10-100 years old */
export function isValidBirthDate(dateStr: string): boolean {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const minAge = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate());
  const maxAge = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
  return d >= minAge && d <= maxAge;
}

/** Validate instagram handle */
export function isValidInstagram(handle: string): boolean {
  return /^@[a-zA-Z0-9._]{1,30}$/.test(handle);
}

/**
 * Validates a Brazilian CPF number.
 */
export function validateCPF(cpf: string): boolean {
  const clean = (cpf ?? '').replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i)) * (10 - i);
  }
  let rem = (sum * 10) % 11;
  if (rem === 10) rem = 0;
  if (rem !== parseInt(clean.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i)) * (11 - i);
  }
  rem = (sum * 10) % 11;
  if (rem === 10) rem = 0;
  if (rem !== parseInt(clean.charAt(10))) return false;

  return true;
}
