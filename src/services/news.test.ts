import { describe, expect, it } from 'vitest'
import { ogImageFrom, parseFeed } from './news'
import { greetingFor } from '@/utils/clock'

describe('parseFeed', () => {
  it('reads a title, link and image out of an RSS item', () => {
    const xml = `<?xml version="1.0"?><rss><channel><item>
      <title><![CDATA[Rockets &amp; stars]]></title>
      <link>https://example.com/story</link>
      <pubDate>Wed, 21 Oct 2026 12:00:00 GMT</pubDate>
      <media:content url="https://example.com/photo.jpg" medium="image" />
    </item></channel></rss>`
    const [story] = parseFeed(xml, 'Example', 'science')
    expect(story.title).toBe('Rockets & stars')
    expect(story.link).toBe('https://example.com/story')
    expect(story.image).toBe('https://example.com/photo.jpg')
    expect(story.publishedAt).toBeGreaterThan(0)
  })

  it('decodes pictures inside the article body and asks BBC for a larger thumb', () => {
    const xml = `<item>
      <title>Coast</title>
      <link>https://example.com/coast</link>
      <media:thumbnail url="https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/abc.jpg"/>
    </item>`
    expect(parseFeed(xml, 'BBC', 'world')[0].image).toBe('https://ichef.bbci.co.uk/ace/standard/800/cpsprodpb/abc.jpg')

    const html = `<item>
      <title>Phone</title>
      <link>https://example.com/phone</link>
      <content:encoded><![CDATA[<img src="https://cdn.example.com/p.jpg?w=1&amp;h=2" />]]></content:encoded>
    </item>`
    expect(parseFeed(html, 'The Verge', 'tech')[0].image).toBe('https://cdn.example.com/p.jpg?w=1&h=2')
  })

  it('keeps the widest picture when a feed offers several sizes', () => {
    const xml = `<item>
      <title>Story</title>
      <link>https://example.com/story</link>
      <description>A short blurb.</description>
      <media:content width="140" url="https://i.guim.co.uk/img/a.jpg?width=140&amp;q=1"/>
      <media:content width="700" url="https://i.guim.co.uk/img/a.jpg?width=700&amp;q=1"/>
    </item>`
    const [story] = parseFeed(xml, 'The Guardian', 'ai')
    expect(story.image).toBe('https://i.guim.co.uk/img/a.jpg?width=700&q=1')
    expect(story.summary).toBe('A short blurb.')
  })
})

describe('ogImageFrom', () => {
  it('reads the article preview image', () => {
    const html = `<meta property="og:image" content="https://techcrunch.com/wp-content/uploads/story.jpg?w=1024" />`
    expect(ogImageFrom(html)).toBe('https://techcrunch.com/wp-content/uploads/story.jpg?w=1024')
  })
})

describe('greetingFor', () => {
  it('uses the name and stays the same across the day', () => {
    const now = new Date(2026, 5, 10, 9, 0, 0)
    expect(greetingFor(9, 'Ava', now)).toMatch(/Ava$/)
    expect(greetingFor(9, 'Ava', now)).toBe(greetingFor(9, 'Ava', now))
    expect(greetingFor(9, '', now)).not.toMatch(/,$/)
  })
})
