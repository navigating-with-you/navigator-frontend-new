/**
 * Employee code validation utilities
 */

export const EMPLOYEE_CODE_CONSTRAINTS = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 50,
  PATTERN: /^[A-Za-z0-9\-_.]*$/,
  PATTERN_DESC: "alphanumeric characters, hyphens, underscores, and dots",
  START_END_PATTERN: /^[A-Za-z0-9].*[A-Za-z0-9]$|^[A-Za-z0-9]$/, // Must start and end with alphanumeric
};

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate employee code format
 * @param code - Employee code to validate
 * @returns Validation result with error message if invalid
 */
export function validateEmployeeCode(code: string | null | undefined): ValidationResult {
  if (!code) {
    return { isValid: true };
  }

  const trimmed = code.trim();
  if (!trimmed) {
    return { isValid: true }; // Empty after trim is valid (optional field)
  }

  // Length check
  if (trimmed.length < EMPLOYEE_CODE_CONSTRAINTS.MIN_LENGTH) {
    return {
      isValid: false,
      error: `Employee code must be at least ${EMPLOYEE_CODE_CONSTRAINTS.MIN_LENGTH} character`,
    };
  }

  if (trimmed.length > EMPLOYEE_CODE_CONSTRAINTS.MAX_LENGTH) {
    return {
      isValid: false,
      error: `Employee code must be at most ${EMPLOYEE_CODE_CONSTRAINTS.MAX_LENGTH} characters`,
    };
  }

  // Character check
  if (!EMPLOYEE_CODE_CONSTRAINTS.PATTERN.test(trimmed)) {
    return {
      isValid: false,
      error: `Employee code can only contain ${EMPLOYEE_CODE_CONSTRAINTS.PATTERN_DESC}`,
    };
  }

  // Cannot start or end with special characters
  if (!EMPLOYEE_CODE_CONSTRAINTS.START_END_PATTERN.test(trimmed)) {
    return {
      isValid: false,
      error: "Employee code cannot start or end with a special character",
    };
  }

  return { isValid: true };
}

/**
 * Get validation constraints as descriptive text
 */
export function getEmployeeCodeConstraintsText(): string {
  return `Employee code must be ${EMPLOYEE_CODE_CONSTRAINTS.MIN_LENGTH}-${EMPLOYEE_CODE_CONSTRAINTS.MAX_LENGTH} characters, containing only ${EMPLOYEE_CODE_CONSTRAINTS.PATTERN_DESC}, and cannot start/end with special characters`;
}

/**
 * Check if a character is allowed in employee code
 */
export function isAllowedCharacter(char: string): boolean {
  return EMPLOYEE_CODE_CONSTRAINTS.PATTERN.test(char);
}

/**
 * Sanitize employee code input (real-time as user types)
 * @param input - Input string
 * @returns Sanitized string with only allowed characters
 */
export function sanitizeEmployeeCodeInput(input: string): string {
  return input
    .split("")
    .filter((char) => isAllowedCharacter(char))
    .join("")
    .substring(0, EMPLOYEE_CODE_CONSTRAINTS.MAX_LENGTH);
}
