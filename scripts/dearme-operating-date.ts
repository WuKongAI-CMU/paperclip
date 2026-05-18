const DEFAULT_DEARME_OPERATING_TIME_ZONE = "America/New_York";

export function dearMeOperatingDate(
  date = new Date(),
  timeZone = DEFAULT_DEARME_OPERATING_TIME_ZONE,
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
