/**
 * Password validation checklist
 * - More than 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one special character
 */
export function validatePassword(password = "") {
  return {
    minLength: password.length > 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
    isValid:
      password.length > 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[^A-Za-z0-9]/.test(password),
  };
}

// Mock registered emails for client-side demo validation
const REGISTERED_EMAILS = [
  "arjun@hyperscale.io",
  "billing@nexusinfotech.com",
  "accounts@apexdigital.in",
  "finance@solariaretail.com",
];

export function isEmailRegistered(email = "") {
  if (!email) return false;
  return REGISTERED_EMAILS.includes(email.trim().toLowerCase());
}

export function isValidEmailFormat(email = "") {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}
