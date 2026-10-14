export function validatePassword(
  value: string,
  minimumLength = 8,
  maximumLength = 64,
  requireStrongPassword = true,
): string | undefined {
  if (!value) return "Enter your password.";
  if (value.length > maximumLength) {
    return `Password must be ${maximumLength} characters or fewer.`;
  }
  if (value.length < minimumLength) {
    return `Password must be at least ${minimumLength} characters.`;
  }
  if (requireStrongPassword && !/[A-Z]/.test(value)) {
    return "Password must contain at least one uppercase letter.";
  }
  if (requireStrongPassword && !/[a-z]/.test(value)) {
    return "Password must contain at least one lowercase letter.";
  }
  if (requireStrongPassword && !/[0-9]/.test(value)) {
    return "Password must contain at least one number.";
  }
  if (requireStrongPassword && !/[^\p{L}\p{N}\s]/u.test(value)) {
    return "Password must contain at least one symbol.";
  }
  return undefined;
}

export function getPasswordRequirements(value: string) {
  return [
    { label: "8 to 64 characters", met: value.length >= 8 && value.length <= 64 },
    { label: "One uppercase letter", met: /[A-Z]/.test(value) },
    { label: "One lowercase letter", met: /[a-z]/.test(value) },
    { label: "One number", met: /[0-9]/.test(value) },
    { label: "One symbol", met: /[^\p{L}\p{N}\s]/u.test(value) },
  ];
}
