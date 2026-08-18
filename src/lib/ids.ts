/**
 * Reference IDs shown on confirmation screens.
 *
 * Generated client-side so a submitter has something to quote. A real backend
 * must issue the authoritative ID — these are display-only until one exists.
 */
function sequence(): string {
  return String(Math.floor(Math.random() * 9000) + 1000)
}

export function challengeId(year: number): string {
  return `CH-${year}-${sequence()}`
}

export function innovationId(year: number): string {
  return `INT-${year}-${sequence()}`
}
