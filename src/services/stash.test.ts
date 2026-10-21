import { describe, expect, it } from 'vitest'
import { stashTabFromInput } from './stash'

describe('stashTabFromInput', () => {
  it('accepts a bare address and names it from the site', () => {
    expect(stashTabFromInput('github.com/delulutab', '')).toEqual({ url: 'https://github.com/delulutab', title: 'github.com' })
  })

  it('keeps a name and rejects anything that is not a web page', () => {
    expect(stashTabFromInput('https://example.com/a', 'Reading')).toMatchObject({ title: 'Reading', url: 'https://example.com/a' })
    expect(stashTabFromInput('chrome://newtab', 'Home')).toBeNull()
    expect(stashTabFromInput('not a link', 'Nope')).toBeNull()
  })
})