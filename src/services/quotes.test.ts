import { describe, expect, it } from 'vitest'
import { quoteAt } from '@/config/quotes'
import { quotesFromJson } from './quotes'

describe('quoteAt', () => {
  const list = [
    { text: 'One', by: 'A' },
    { text: 'Two', by: 'B' },
  ]

  it('changes with the minute and wraps around', () => {
    expect(quoteAt(list, 0)?.text).toBe('One')
    expect(quoteAt(list, 1)?.text).toBe('Two')
    expect(quoteAt(list, 1, 1)?.text).toBe('One')
    expect(quoteAt([], 4)).toBeNull()
  })
})

describe('quotesFromJson', () => {
  it('reads DeluluTab, ZenQuotes and Quotable shapes', () => {
    expect(quotesFromJson([{ text: 'Be kind.', by: 'DeluluTab' }])).toEqual([{ text: 'Be kind.', by: 'DeluluTab' }])
    expect(quotesFromJson([{ q: 'Stay', a: 'Zen' }])).toEqual([{ text: 'Stay', by: 'Zen' }])
    expect(quotesFromJson({ results: [{ content: 'Begin', author: 'Ada' }] })).toEqual([{ text: 'Begin', by: 'Ada' }])
  })
})
