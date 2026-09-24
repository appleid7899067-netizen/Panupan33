export type ValidationResult = { valid: boolean; errors: string[] };

export function validateRecord<T extends Record<string, unknown>>(record: T, requiredFields: string[]): ValidationResult {
  const errors = requiredFields.filter((field) => record[field] == null || record[field] === "");
  return { valid: errors.length === 0, errors };
}

export function anomalyCheck(previousCount: number | undefined, currentCount: number, minimumRatio = 0.2): ValidationResult {
  if (previousCount == null || previousCount <= 0) return { valid: true, errors: [] };
  const ratio = currentCount / previousCount;
  return ratio >= minimumRatio ? { valid: true, errors: [] } : { valid: false, errors: [`Record count dropped to ${Math.round(ratio * 100)}% of the previous batch.`] };
}
