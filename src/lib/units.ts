export interface Unit {
  id: string
  label: string
  /** Multiply by this to get the category's base unit. Omitted for temperature. */
  factor?: number
  toBase?: (v: number) => number
  fromBase?: (v: number) => number
}

export interface UnitCategory {
  id: string
  label: string
  units: Unit[]
  /** Sensible starting pair. */
  defaults: [string, string]
}

const u = (id: string, label: string, factor: number): Unit => ({ id, label, factor })

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: 'length',
    label: 'Length',
    defaults: ['km', 'mi'],
    units: [u('mm', 'Millimetres', 0.001), u('cm', 'Centimetres', 0.01), u('m', 'Metres', 1), u('km', 'Kilometres', 1000), u('in', 'Inches', 0.0254), u('ft', 'Feet', 0.3048), u('yd', 'Yards', 0.9144), u('mi', 'Miles', 1609.344)],
  },
  {
    id: 'mass',
    label: 'Mass',
    defaults: ['kg', 'lb'],
    units: [u('mg', 'Milligrams', 1e-6), u('g', 'Grams', 0.001), u('kg', 'Kilograms', 1), u('t', 'Tonnes', 1000), u('oz', 'Ounces', 0.028349523125), u('lb', 'Pounds', 0.45359237), u('st', 'Stone', 6.35029318)],
  },
  {
    id: 'temperature',
    label: 'Temperature',
    defaults: ['c', 'f'],
    units: [
      { id: 'c', label: 'Celsius', toBase: (v) => v, fromBase: (v) => v },
      { id: 'f', label: 'Fahrenheit', toBase: (v) => ((v - 32) * 5) / 9, fromBase: (v) => (v * 9) / 5 + 32 },
      { id: 'k', label: 'Kelvin', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    ],
  },
  {
    id: 'volume',
    label: 'Volume',
    defaults: ['l', 'gal'],
    units: [u('ml', 'Millilitres', 0.001), u('l', 'Litres', 1), u('m3', 'Cubic metres', 1000), u('tsp', 'Teaspoons (US)', 0.00492892159375), u('tbsp', 'Tablespoons (US)', 0.01478676478125), u('floz', 'Fluid ounces (US)', 0.0295735295625), u('cup', 'Cups (US)', 0.2365882365), u('pt', 'Pints (US)', 0.473176473), u('qt', 'Quarts (US)', 0.946352946), u('gal', 'Gallons (US)', 3.785411784)],
  },
  {
    id: 'speed',
    label: 'Speed',
    defaults: ['kmh', 'mph'],
    units: [u('ms', 'Metres / second', 1), u('kmh', 'Kilometres / hour', 1 / 3.6), u('mph', 'Miles / hour', 0.44704), u('kn', 'Knots', 1852 / 3600), u('fts', 'Feet / second', 0.3048)],
  },
  {
    id: 'area',
    label: 'Area',
    defaults: ['m2', 'ft2'],
    units: [u('cm2', 'Square centimetres', 1e-4), u('m2', 'Square metres', 1), u('ha', 'Hectares', 1e4), u('km2', 'Square kilometres', 1e6), u('in2', 'Square inches', 6.4516e-4), u('ft2', 'Square feet', 0.09290304), u('ac', 'Acres', 4046.8564224), u('mi2', 'Square miles', 2589988.110336)],
  },
  {
    id: 'data',
    label: 'Data',
    defaults: ['gb', 'mib'],
    units: [u('bit', 'Bits', 0.125), u('b', 'Bytes', 1), u('kb', 'Kilobytes (1000)', 1e3), u('mb', 'Megabytes (1000²)', 1e6), u('gb', 'Gigabytes (1000³)', 1e9), u('tb', 'Terabytes (1000⁴)', 1e12), u('kib', 'Kibibytes (1024)', 1024), u('mib', 'Mebibytes (1024²)', 1024 ** 2), u('gib', 'Gibibytes (1024³)', 1024 ** 3)],
  },
  {
    id: 'time',
    label: 'Time',
    defaults: ['h', 'min'],
    units: [u('ms', 'Milliseconds', 0.001), u('s', 'Seconds', 1), u('min', 'Minutes', 60), u('h', 'Hours', 3600), u('d', 'Days', 86400), u('wk', 'Weeks', 604800)],
  },
]

export const categoryById = (id: string) => UNIT_CATEGORIES.find((c) => c.id === id) ?? UNIT_CATEGORIES[0]

export function convert(value: number, category: UnitCategory, fromId: string, toId: string): number {
  const from = category.units.find((x) => x.id === fromId)
  const to = category.units.find((x) => x.id === toId)
  if (!from || !to) return NaN
  const base = from.toBase ? from.toBase(value) : value * from.factor!
  const out = to.fromBase ? to.fromBase(base) : base / to.factor!
  return Number(out.toPrecision(12)) // drop float noise such as 0.30000000000000004
}

/** Readable number for a conversion result: no exponent for ordinary sizes, enough digits to be useful. */
export function formatConverted(n: number): string {
  if (!Number.isFinite(n)) return '—'
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs >= 1e15 || abs < 1e-6) return n.toExponential(6).replace(/\.?0+e/, 'e')
  return n.toLocaleString('en-US', { maximumSignificantDigits: 10 })
}
