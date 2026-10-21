import { describe, expect, it } from 'vitest'
import { greetingFor, periodFor, readGreetings } from './greetings'

describe('greetingFor', () => {
  const now = new Date(2026, 5, 10, 9, 0, 0)

  it('uses the name and stays the same across the day', () => {
    expect(greetingFor(9, 'Ava', now)).toMatch(/Ava$/)
    expect(greetingFor(9, 'Ava', now)).toBe(greetingFor(9, 'Ava', now))
    expect(greetingFor(9, '', now)).not.toMatch(/,$/)
  })

  it('changes with the part of the day', () => {
    expect(periodFor(2)).toBe('late')
    expect(periodFor(9)).toBe('morning')
    expect(periodFor(14)).toBe('afternoon')
    expect(periodFor(18)).toBe('evening')
    expect(periodFor(22)).toBe('night')
    expect(greetingFor(2, '', now)).not.toBe(greetingFor(9, '', now))
    expect(greetingFor(22, '', now)).not.toBe(greetingFor(18, '', now))
  })

  it('reads a custom book and rejects a broken one', () => {
    const custom = {
      late: ['Still up'],
      morning: ['Hello'],
      afternoon: ['Good afternoon'],
      evening: ['Good evening'],
      night: ['Good night'],
    }
    expect(greetingFor(9, 'Ava', now, custom)).toBe('Hello, Ava')
    expect(readGreetings(custom).book?.morning).toEqual(['Hello'])
    expect(readGreetings({ morning: ['Hi'] }).error).toMatch(/late/)
    expect(readGreetings([]).error).toBeTruthy()
  })
})
