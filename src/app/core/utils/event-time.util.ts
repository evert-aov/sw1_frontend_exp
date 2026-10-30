/** Convierte la hora civil del evento en Bolivia (UTC-04:00) al instante UTC almacenado. */
export function eventTimeInBolivia(date: string, time: string): string {
  const value = new Date(`${date}T${time}:00-04:00`);
  if (!Number.isFinite(value.getTime())) throw new Error('Invalid event time');
  return value.toISOString();
}
