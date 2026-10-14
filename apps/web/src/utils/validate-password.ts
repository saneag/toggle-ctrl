export function validatePassword(
  value: string,
  minimumLength = 8,
  maximumLength = 64,
): string | undefined {
  if (!value) return "Enter your password.";
  if (value.length > maximumLength) {
    return `Password must be ${maximumLength} characters or fewer.`;
  }
  if (value.length < minimumLength) {
    return `Password must be at least ${minimumLength} characters.`;
  }
  return undefined;
}
