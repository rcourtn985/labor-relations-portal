import { FilterOption } from "./types";

export function getLabels(values: string[], options: FilterOption[]) {
  return values
    .map((value) => options.find((option) => option.value === value)?.label ?? value)
    .filter(Boolean);
}

export function summarizeMultiSelect(
  values: string[],
  options: FilterOption[],
  allLabel: string,
  compactCountLabel?: string
) {
  if (values.length === 0) return allLabel;

  const labels = getLabels(values, options);

  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return labels.join(", ");

  return `${labels.length} ${compactCountLabel ?? "selected"}`;
}

export function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}