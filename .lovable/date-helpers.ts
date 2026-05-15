import { eachDayOfInterval, isSaturday, isSunday, type Interval } from 'date-fns'

type WorkWeekMode = 'working-week' | 'full-week'

/**
 * Calcula el número de días en un intervalo de fechas, opcionalmente excluyendo los fines de semana.
 * @param interval - Un objeto con `start` y `end` (fechas de inicio y fin).
 * @param mode - 'working-week' (L-V) o 'full-week' (L-D).
 * @returns El número total de días según el modo.
 */
export function countDaysInInterval(
  interval: Interval,
  mode: WorkWeekMode
): number {
  if (!interval.start || !interval.end) {
    return 0
  }

  const allDays = eachDayOfInterval(interval)

  if (mode === 'full-week') {
    return allDays.length
  }

  // Modo 'working-week'
  const workDays = allDays.filter(day => !isSaturday(day) && !isSunday(day))
  return workDays.length
}