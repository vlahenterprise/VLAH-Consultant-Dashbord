const dateFormatter = new Intl.DateTimeFormat("sr-RS", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Belgrade",
});

const dateTimeFormatter = new Intl.DateTimeFormat("sr-RS", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Belgrade",
});

const compactNumberFormatter = new Intl.NumberFormat("sr-RS", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatDate(input: string) {
  return dateFormatter.format(new Date(input));
}

export function formatDateTime(input: string) {
  return dateTimeFormatter.format(new Date(input));
}

export function formatCompactNumber(value: number) {
  return compactNumberFormatter.format(value);
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function formatSignedPercent(value: number) {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}
