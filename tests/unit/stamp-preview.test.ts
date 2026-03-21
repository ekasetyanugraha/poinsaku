import { describe, it, expect } from 'vitest'
import { calculateStampsFromAmount } from '../../server/utils/validators'

describe('stamp preview calculation', () => {
  it('calculates 5 stamps for 50000 / 10000', () => {
    expect(calculateStampsFromAmount(50000, 10000)).toBe(5)
  })
  it('floors fractional result: 49999 / 10000 = 4', () => {
    expect(calculateStampsFromAmount(49999, 10000)).toBe(4)
  })
  it('returns 0 for amount = 0', () => {
    expect(calculateStampsFromAmount(0, 10000)).toBe(0)
  })
  it('returns 0 when amountPerStamp is 0 (division guard)', () => {
    expect(calculateStampsFromAmount(50000, 0)).toBe(0)
  })
  it('returns 0 for negative amount', () => {
    expect(calculateStampsFromAmount(-100, 10000)).toBe(0)
  })
  it('returns 0 for negative amountPerStamp', () => {
    expect(calculateStampsFromAmount(50000, -10000)).toBe(0)
  })
  it('handles large amounts correctly', () => {
    expect(calculateStampsFromAmount(1000000, 10000)).toBe(100)
  })
})
