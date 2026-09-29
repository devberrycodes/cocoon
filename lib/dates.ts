/** Use the same calendar day in the browser and API, independent of server timezone. */
export function todayDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Local wall time for datetime-local; conversion to UTC happens only on submit. */
export function localDateTime(value: string | Date = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!Number.isFinite(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function formatDue(value: string): string {
  const date = new Date(value);
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}
export function validDue(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  // Legacy date-only clients remain supported; datetime clients must send a timezone.
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return false;
  const calendar = value.slice(0, 10);
  const day = new Date(`${calendar}T00:00:00Z`);
  return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === calendar && Number.isFinite(Date.parse(value));
}
