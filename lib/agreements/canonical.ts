type CanonicalAgreementInput = {
  filename?: string | null;
  chapter?: string | null;
  localUnion?: string | null;
  cbaType?: string | null;
  state?: string | null;
  effectiveFrom?: Date | string | null;
  effectiveTo?: Date | string | null;
};

function normalizeValue(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function normalizeKey(value: string | null | undefined): string {
  return normalizeValue(value).toLowerCase();
}

function normalizeDateKey(value: Date | string | null | undefined): string {
  if (!value) return "";

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  }

  const trimmed = value.trim();
  if (!trimmed) return "";

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

export function buildCanonicalAgreementKey(
  input: CanonicalAgreementInput
): string {
  return [
    normalizeKey(input.filename),
    normalizeKey(input.chapter),
    normalizeKey(input.localUnion),
    normalizeKey(input.cbaType),
    normalizeKey(input.state),
    normalizeDateKey(input.effectiveFrom),
    normalizeDateKey(input.effectiveTo),
  ].join("||");
}