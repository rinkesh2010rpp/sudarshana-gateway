// The Pacific calendar day, computed the same way the API computes it.
//
// Log files and "Turns today" are named on Rinkesh's Pacific day, so the
// panel's "Today" / "Yesterday" labels must use that same day or an 11pm (or
// 00:30) cycle files under the wrong heading. A fixed UTC-8 is only right from
// November to March: through daylight saving, local work done between midnight
// and 01:00 lands on the previous UTC-8 date and would read "Yesterday".
//
// tzdata isn't guaranteed in the browser bundle the way it isn't in the image,
// so apply the US rule directly: PDT from 02:00 local on the second Sunday of
// March (= 10:00 UTC) to 02:00 local on the first Sunday of November
// (= 09:00 UTC); PST otherwise. Mirrors _pacific_offset_hours in agent/main.py.

export function pacificOffsetHours(date = new Date()) {
  const t = date instanceof Date ? date.getTime() : Number(date)
  const year = new Date(t).getUTCFullYear()

  // nth (1-based) Sunday of a UTC month, at 00:00 UTC.
  const nthSunday = (y, month, n) => {
    const first = Date.UTC(y, month - 1, 1)
    const firstWeekday = new Date(first).getUTCDay() // 0 = Sunday
    return first + ((7 - firstWeekday) % 7 + 7 * (n - 1)) * 86400000
  }

  const start = nthSunday(year, 3, 2) + 10 * 3600000 // 02:00 PST
  const end = nthSunday(year, 11, 1) + 9 * 3600000 // 02:00 PDT
  return t >= start && t < end ? 7 : 8
}

// YYYY-MM-DD on the Pacific day that contains `date`.
export function pacificDay(date = new Date()) {
  const t = date instanceof Date ? date.getTime() : Number(date)
  const shifted = new Date(t - pacificOffsetHours(date) * 3600000)
  return shifted.toISOString().slice(0, 10)
}
