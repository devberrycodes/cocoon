/** Use the same calendar day in the browser and API, independent of server timezone. */
export function todayDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
