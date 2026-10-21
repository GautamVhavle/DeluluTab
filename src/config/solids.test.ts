import { describe, expect, it } from 'vitest'
import { cleanSolidList } from './solids'

describe('cleanSolidList', () => {
  it('keeps unique custom colours and drops presets and junk', () => {
    expect(cleanSolidList(['#112233', '#112233', '#0b1020', 'nope', '#abcdef'])).toEqual(['#112233', '#abcdef'])
  })
})
