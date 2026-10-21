import { describe, expect, it } from 'vitest'
import { photoFromJson } from './pictureLink'

describe('photoFromJson', () => {
  it('reads a picture address from the usual shapes', () => {
    expect(photoFromJson({ hdurl: 'https://apod.nasa.gov/apod/image/day.jpg', title: 'Sky' })).toEqual({
      src: 'https://apod.nasa.gov/apod/image/day.jpg',
      title: 'Sky',
    })
    expect(photoFromJson({ url: 'http://example.com/a.jpg' })).toBeNull()
    expect(photoFromJson({ images: [{ url: 'https://example.com/a.jpg', title: 'Bridge' }] })?.src).toBe('https://example.com/a.jpg')
  })
})
