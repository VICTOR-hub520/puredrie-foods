const nairobiDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Nairobi",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function expectedDeliveryDate(orderDate: Date): Date {
  const parts = nairobiDateFormatter.formatToParts(orderDate);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return new Date(Date.UTC(year, month - 1, day + 6, 21));
}

export function formatNairobiDate(date: Date): string {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "long",
    timeZone: "Africa/Nairobi",
  }).format(date);
}

export function expectedDeliveryDateLabel(now = new Date()): string {
  return formatNairobiDate(expectedDeliveryDate(now));
}
