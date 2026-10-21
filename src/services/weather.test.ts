import { describe, expect, it } from 'vitest'
import { placeFromReverse } from './weather'

describe('placeFromReverse', () => {
  it('reads the city and keeps the original point', () => {
    expect(
      placeFromReverse(
        { city: 'Hyderabad', locality: 'Himayatnagar', principalSubdivision: 'Telangana', countryName: 'India' },
        17.39,
        78.49,
      ),
    ).toEqual({ name: 'Hyderabad', region: 'Telangana, India', latitude: 17.39, longitude: 78.49 })
  })

  it('returns null when there is no city', () => {
    expect(placeFromReverse({}, 1, 2)).toBeNull()
    expect(placeFromReverse({ locality: '  ' }, 1, 2)).toBeNull()
  })
})
