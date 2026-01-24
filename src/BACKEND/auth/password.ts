import zxcvbn from 'zxcvbn';

/**
 * Hashes a password using Bun's built-in password hashing
 * @param password - Plain text password to hash
 * @returns Promise resolving to the hashed password
 */


/**
 * Validates password strength using zxcvbn
 * @param password - Password to validate
 * @returns Object containing validation result and score
 */
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  score: number;
  feedback: string[]
} => {
  const result = zxcvbn(password);
  const minScore = 3; // Require at least medium strength
  
  return {
    isValid: result.score >= minScore,
    score: result.score,
    feedback: result.feedback.suggestions
  };
};

/**
 * Checks if password meets minimum requirements
 * @param password - Password to check
 * @returns Boolean indicating if password meets minimum requirements
 */
export const meetsMinimumRequirements = (password: string): boolean => {
  // Minimum 8 characters
  return password.length >= 8;
};