/** Public-domain lines and a few original ones. The widget walks whichever list is selected, one line a minute. */
export interface Quote {
  text: string
  by: string
}

export const QUOTES: Quote[] = [
  { text: 'The sun himself is weak when he first rises, and gathers strength and courage as the day goes on.', by: 'Charles Dickens' },
  { text: 'What lies behind us and what lies before us are tiny matters compared to what lies within us.', by: 'Ralph Waldo Emerson' },
  { text: 'Keep your face always toward the sunshine, and shadows will fall behind you.', by: 'Walt Whitman' },
  { text: 'It is never too late to be what you might have been.', by: 'George Eliot' },
  { text: 'Do not wait to strike till the iron is hot; but make it hot by striking.', by: 'William Butler Yeats' },
  { text: 'Act as if what you do makes a difference. It does.', by: 'William James' },
  { text: 'We are all in the gutter, but some of us are looking at the stars.', by: 'Oscar Wilde' },
  { text: 'The secret of getting ahead is getting started.', by: 'Mark Twain' },
  { text: 'Today is a good day to begin again, quietly and without apology.', by: 'DeluluTab' },
  { text: 'Small progress is still progress. Count it.', by: 'DeluluTab' },
  { text: 'You do not have to feel ready. You only have to begin.', by: 'DeluluTab' },
  { text: 'Be kind to the version of you that got you here.', by: 'DeluluTab' },
  { text: 'Somewhere in the next hour is a moment you will be glad you stayed for.', by: 'DeluluTab' },
]

export const CLASSIC_QUOTES = QUOTES.filter((quote) => quote.by !== 'DeluluTab')

/** The line showing during this minute. `skip` moves ahead when the user asks for another. */
export function quoteAt(list: Quote[], minute: number, skip = 0): Quote | null {
  if (!list.length) return null
  const index = ((minute + skip) % list.length + list.length) % list.length
  return list[index]
}

export function quoteForDay(now = new Date(), offset = 0): Quote {
  const start = new Date(now.getFullYear(), 0, 0)
  const day = Math.floor((now.getTime() - start.getTime()) / 86_400_000)
  return QUOTES[(day + offset) % QUOTES.length]
}
