export function generateSixDigitOtp(): string {
  // Ensures a 6-digit code, including leading zeros
  const num = Math.floor(Math.random() * 1_000_000);
  return num.toString().padStart(6, '0');
}
