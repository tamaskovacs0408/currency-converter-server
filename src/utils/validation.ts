export function validateCurrencyCode(code: string): boolean {
  return /^[A-Z]{3}$/.test(code);
}

export function validateAmount(amount: number): boolean {
  return !isNaN(amount) && amount > 0 && amount < 1000000000;
}