/**
 * A small expression evaluator: recursive descent, no eval().
 *
 *   expr   := term (('+' | '-') term)*
 *   term   := unary (('*' | '/' | implicit) unary)*      "2pi" and "2(3+4)" multiply implicitly
 *   unary  := ('-' | '+') unary | power
 *   power  := postfix ('^' unary)?                        right-associative: 2^3^2 = 2^9, and -2^2 = -4
 *   postfix:= primary '%'*                                50% = 0.5
 *   primary:= number | constant | name '(' expr ')' | '(' expr ')'
 */

export class CalcError extends Error {}

export interface CalcOptions {
  angle?: 'deg' | 'rad'
  /** Value of the `ans` constant. */
  ans?: number
}

type Token = { type: 'num'; value: number } | { type: 'name'; value: string; raw: string } | { type: 'op'; value: string }

const NUMBER = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i

function tokenize(input: string): Token[] {
  const src = input
    .replace(/[×·]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[−–]/g, '-')
    .replace(/π/g, 'pi')
    .replace(/√\s*(\d+\.?\d*|\.\d+)/g, 'sqrt($1)')
    .replace(/√/g, 'sqrt')
    .replace(/,(?=\d{3}\b)/g, '') // 1,000 -> 1000
  const tokens: Token[] = []
  let i = 0
  while (i < src.length) {
    const rest = src.slice(i)
    const ch = src[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    const num = NUMBER.exec(rest)
    if (num) {
      tokens.push({ type: 'num', value: parseFloat(num[0]) })
      i += num[0].length
      continue
    }
    const name = /^(log2|[a-z]+)/i.exec(rest)
    if (name) {
      tokens.push({ type: 'name', value: name[0].toLowerCase(), raw: name[0] })
      i += name[0].length
      continue
    }
    if ('+-*/^%()'.includes(ch)) {
      tokens.push({ type: 'op', value: ch })
      i++
      continue
    }
    throw new CalcError(`Unexpected "${ch}"`)
  }
  return tokens
}

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 }

const fromRadians = (r: number, angle: 'deg' | 'rad') => (angle === 'deg' ? (r * 180) / Math.PI : r)

const FUNCTIONS: Record<string, (x: number, angle: 'deg' | 'rad') => number> = {
  sqrt: (x) => Math.sqrt(x),
  cbrt: (x) => Math.cbrt(x),
  abs: (x) => Math.abs(x),
  round: (x) => Math.round(x),
  floor: (x) => Math.floor(x),
  ceil: (x) => Math.ceil(x),
  exp: (x) => Math.exp(x),
  ln: (x) => Math.log(x),
  log: (x) => Math.log10(x),
  log2: (x) => Math.log2(x),
  sin: (x, a) => Math.sin(a === 'deg' ? (x * Math.PI) / 180 : x),
  cos: (x, a) => Math.cos(a === 'deg' ? (x * Math.PI) / 180 : x),
  tan: (x, a) => Math.tan(a === 'deg' ? (x * Math.PI) / 180 : x),
  asin: (x, a) => fromRadians(Math.asin(x), a),
  acos: (x, a) => fromRadians(Math.acos(x), a),
  atan: (x, a) => fromRadians(Math.atan(x), a),
}

/** Rounds away float noise (0.1 + 0.2 -> 0.3) but leaves integers that doubles can hold exactly alone. */
function trimNoise(n: number, digits: number) {
  return Number.isInteger(n) && Math.abs(n) <= Number.MAX_SAFE_INTEGER ? n : Number(n.toPrecision(digits))
}

export function evaluate(input: string, options: CalcOptions = {}): number {
  const angle = options.angle ?? 'deg'
  const tokens = tokenize(input)
  if (tokens.length === 0) throw new CalcError('Type something to calculate')
  let pos = 0

  const peek = () => tokens[pos]
  const isOp = (t: Token | undefined, v: string) => t?.type === 'op' && t.value === v

  function expr(): number {
    let left = term()
    while (isOp(peek(), '+') || isOp(peek(), '-')) {
      const op = (tokens[pos++] as { value: string }).value
      const right = term()
      left = op === '+' ? left + right : left - right
    }
    return left
  }

  function term(): number {
    let left = unary()
    for (;;) {
      const t = peek()
      if (isOp(t, '*') || isOp(t, '/')) {
        pos++
        const right = unary()
        if (t!.value === '/' && right === 0) throw new CalcError("Can't divide by zero")
        left = t!.value === '*' ? left * right : left / right
      } else if (t && (t.type === 'num' || t.type === 'name' || isOp(t, '('))) {
        left *= unary() // implicit multiplication: 2pi, 3(4+1)
      } else {
        return left
      }
    }
  }

  function unary(): number {
    if (isOp(peek(), '-')) {
      pos++
      return -unary()
    }
    if (isOp(peek(), '+')) {
      pos++
      return unary()
    }
    return power()
  }

  function power(): number {
    const base = postfix()
    if (isOp(peek(), '^')) {
      pos++
      return Math.pow(base, unary())
    }
    return base
  }

  function postfix(): number {
    let value = primary()
    while (isOp(peek(), '%')) {
      pos++
      value /= 100
    }
    return value
  }

  function primary(): number {
    const t = tokens[pos]
    if (!t) throw new CalcError('Incomplete expression')
    pos++
    if (t.type === 'num') return t.value
    if (t.type === 'name') {
      if (t.value === 'ans') {
        if (options.ans === undefined) throw new CalcError('No previous answer yet')
        return options.ans
      }
      // Own properties only: "constructor" or "toString" must not resolve through Object.prototype.
      if (Object.hasOwn(CONSTANTS, t.value)) return CONSTANTS[t.value]
      if (!Object.hasOwn(FUNCTIONS, t.value)) throw new CalcError(`Unknown "${t.raw}"`)
      const fn = FUNCTIONS[t.value]
      if (!isOp(peek(), '(')) throw new CalcError(`${t.raw} needs brackets, like ${t.raw}(9)`)
      pos++
      const arg = expr()
      if (!isOp(peek(), ')')) throw new CalcError('Missing closing bracket')
      pos++
      return fn(arg, angle)
    }
    if (t.value === '(') {
      const inner = expr()
      if (!isOp(peek(), ')')) throw new CalcError('Missing closing bracket')
      pos++
      return inner
    }
    throw new CalcError(`Unexpected "${t.value}"`)
  }

  const result = expr()
  if (pos < tokens.length) {
    const t = tokens[pos]
    throw new CalcError(`Unexpected "${t.value}"`)
  }
  if (Number.isNaN(result)) throw new CalcError('Not a real number')
  if (!Number.isFinite(result)) throw new CalcError('Result is too large')
  return trimNoise(result, 15)
}

/** `display` has thousands separators for reading; `raw` is plain and safe to copy or reuse. */
export function formatResult(n: number): { display: string; raw: string } {
  const clean = trimNoise(n, 12)
  const abs = Math.abs(clean)
  if (clean !== 0 && (abs >= 1e15 || abs < 1e-6)) {
    const exp = clean.toExponential(8).replace(/\.?0+e/, 'e')
    return { display: exp, raw: exp }
  }
  return {
    display: clean.toLocaleString('en-US', { maximumFractionDigits: 10 }),
    raw: String(clean),
  }
}
