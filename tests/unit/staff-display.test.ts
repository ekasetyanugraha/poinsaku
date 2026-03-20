import { describe, it, expect } from 'vitest'
import { formatDistanceToNow } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

function relativeTime(isoString: string | null): string {
  if (!isoString) return 'Belum pernah login'
  return formatDistanceToNow(new Date(isoString), { addSuffix: true, locale: idLocale })
}

describe('relativeTime', () => {
  it('returns "Belum pernah login" for null input', () => {
    expect(relativeTime(null)).toBe('Belum pernah login')
  })

  it('returns Indonesian relative time for valid ISO string', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const result = relativeTime(oneHourAgo)
    expect(result).toContain('lalu')
  })

  it('returns relative time for recent timestamp', () => {
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString()
    const result = relativeTime(thirtySecondsAgo)
    expect(result).toContain('lalu')
  })
})
