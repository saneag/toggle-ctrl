export function validatePassword(value: string, minimumLength: number): string | undefined {
  if (!value) return "Enter your password.";
  if (value.length > 256) return "Password must be 256 characters or fewer.";
  if (value.length < minimumLength) {
    return `Password must be at least ${minimumLength} characters.`;
  }
  return undefined;
}
