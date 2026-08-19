/**
 * Sunrise and sunset, for choosing the ground by daylight rather than by clock.
 *
 * A fixed hour is wrong for a site that says INDIA / GLOBAL: 18:00 is broad
 * daylight in Reykjavik in June and long dark in Delhi in December. Actual
 * daylight needs a latitude, a longitude and a date.
 *
 * NOAA's solar position algorithm, to the precision this needs — a minute or
 * two either side of true sunrise is invisible in a colour scheme. Everything
 * is in UTC minutes from midnight; the caller compares against the same.
 */

const RAD = Math.PI / 180

/**
 * The zenith angle taken as sunrise. 90.833° rather than 90°, because the sun
 * is a disc rather than a point and the atmosphere refracts its image above
 * the horizon before it is geometrically there.
 */
const ZENITH = 90.833

export type DaylightKind = 'normal' | 'polar-day' | 'polar-night'

export interface SunTimes {
  kind: DaylightKind
  /** UTC minutes from midnight. Null when the sun does not cross the horizon. */
  sunriseUtcMin: number | null
  sunsetUtcMin: number | null
}

/** Day of the year, 1–366. */
export function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1)
  const here = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  return Math.round((here - start) / 86_400_000) + 1
}

/**
 * Sunrise and sunset in UTC minutes.
 *
 * Above the Arctic and below the Antarctic circles the sun may not cross the
 * horizon at all. That is not an error to swallow: `kind` says which, and the
 * caller picks a ground for the whole day rather than pretending there is a
 * sunrise at some default hour.
 */
export function sunTimes(latitude: number, longitude: number, date: Date): SunTimes {
  const n = dayOfYear(date)

  // Fractional year, then the sun's declination and the equation of time.
  const gamma = ((2 * Math.PI) / 365) * (n - 1 + 0.5)
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma))
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma)

  const latRad = latitude * RAD
  const cosH =
    Math.cos(ZENITH * RAD) / (Math.cos(latRad) * Math.cos(decl)) - Math.tan(latRad) * Math.tan(decl)

  // |cos H| > 1 means the horizon is never crossed on this date.
  if (cosH > 1) return { kind: 'polar-night', sunriseUtcMin: null, sunsetUtcMin: null }
  if (cosH < -1) return { kind: 'polar-day', sunriseUtcMin: null, sunsetUtcMin: null }

  const ha = Math.acos(cosH) / RAD
  const noonUtc = 720 - 4 * longitude - eqTime
  const wrap = (m: number) => ((m % 1440) + 1440) % 1440

  return {
    kind: 'normal',
    sunriseUtcMin: wrap(noonUtc - 4 * ha),
    sunsetUtcMin: wrap(noonUtc + 4 * ha),
  }
}

/**
 * Whether it is light out, given the times and the moment.
 *
 * Handles the case where the daylight window crosses midnight UTC, which it
 * does for every longitude far enough from Greenwich — sunset before sunrise
 * in UTC minutes means the day wraps, not that the sun set before it rose.
 */
export function isDaylight(times: SunTimes, utcMinuteOfDay: number): boolean {
  if (times.kind === 'polar-day') return true
  if (times.kind === 'polar-night') return false
  const { sunriseUtcMin: rise, sunsetUtcMin: set } = times
  if (rise === null || set === null) return true
  return rise <= set
    ? utcMinuteOfDay >= rise && utcMinuteOfDay < set
    : utcMinuteOfDay >= rise || utcMinuteOfDay < set
}

/** Coarse enough to place a sunrise, too coarse to place a person. */
export const coarse = (value: number) => Math.round(value)
