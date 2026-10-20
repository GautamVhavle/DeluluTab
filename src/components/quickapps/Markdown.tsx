import { Fragment, type ReactNode } from 'react'

/**
 * A deliberately small Markdown renderer for notes: headings, lists (including - [ ] tasks), quotes,
 * fenced code, rules, and **bold**, *italic*, `code` and [links](https://…) inline.
 * It builds React elements directly, so note text can never inject HTML.
 */

const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(\[[^\]\n]+\]\([^)\s]+\))/g

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let n = 0
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0
    if (at > last) out.push(text.slice(last, at))
    const [token] = m
    const key = `${keyBase}-${n++}`
    if (m[1]) out.push(<code key={key} className="rounded bg-secondary px-1 py-0.5 font-mono text-[0.85em]">{token.slice(1, -1)}</code>)
    else if (m[2]) out.push(<strong key={key}>{inline(token.slice(2, -2), key)}</strong>)
    else if (m[3]) out.push(<em key={key}>{inline(token.slice(1, -1), key)}</em>)
    else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)!
      // Only http(s) links become clickable; anything else (javascript:, data:) stays plain text.
      out.push(
        /^https?:\/\//i.test(link[2]) ? (
          <a key={key} href={link[2]} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{link[1]}</a>
        ) : (
          token
        ),
      )
    }
    last = at + token.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

type Block =
  | { type: 'h'; level: 1 | 2 | 3; text: string }
  | { type: 'p'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'code'; text: string }
  | { type: 'hr' }
  | { type: 'ul'; items: { text: string; task?: boolean; done?: boolean }[] }
  | { type: 'ol'; items: { text: string }[] }

function parse(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    if (line.startsWith('```')) {
      const body: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) body.push(lines[i++])
      i++ // closing fence (or end of input)
      blocks.push({ type: 'code', text: body.join('\n') })
      continue
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line)
    if (h) {
      blocks.push({ type: 'h', level: h[1].length as 1 | 2 | 3, text: h[2] })
      i++
      continue
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push({ type: 'hr' })
      i++
      continue
    }
    if (/^>\s?/.test(line)) {
      const body: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ''))
      blocks.push({ type: 'quote', text: body.join(' ') })
      continue
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: { text: string; task?: boolean; done?: boolean }[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const body = lines[i++].replace(/^\s*[-*]\s+/, '')
        const task = /^\[([ xX])\]\s+(.*)$/.exec(body)
        items.push(task ? { text: task[2], task: true, done: task[1] !== ' ' } : { text: body })
      }
      blocks.push({ type: 'ul', items })
      continue
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: { text: string }[] = []
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push({ text: lines[i++].replace(/^\s*\d+[.)]\s+/, '') })
      blocks.push({ type: 'ol', items })
      continue
    }
    const body: string[] = []
    while (i < lines.length && lines[i].trim() && !/^(```|#{1,3}\s|>\s?|\s*[-*]\s+|\s*\d+[.)]\s+|-{3,}\s*$)/.test(lines[i])) body.push(lines[i++])
    blocks.push({ type: 'p', text: body.join(' ') })
  }
  return blocks
}

export function Markdown({ source }: { source: string }) {
  const blocks = parse(source)
  if (blocks.length === 0) return <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>

  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((b, i) => {
        const key = `b${i}`
        switch (b.type) {
          case 'h':
            return <p key={key} role="heading" aria-level={b.level} className={b.level === 1 ? 'text-xl font-semibold' : b.level === 2 ? 'text-lg font-semibold' : 'font-semibold'}>{inline(b.text, key)}</p>
          case 'p':
            return <p key={key}>{inline(b.text, key)}</p>
          case 'quote':
            return <blockquote key={key} className="border-l-2 pl-3 text-muted-foreground">{inline(b.text, key)}</blockquote>
          case 'code':
            return <pre key={key} className="overflow-x-auto rounded-lg bg-secondary p-3 font-mono text-xs">{b.text}</pre>
          case 'hr':
            return <hr key={key} className="border-border" />
          case 'ul':
            return (
              <ul key={key} className="space-y-1">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-2">
                    {it.task ? <input type="checkbox" checked={!!it.done} readOnly tabIndex={-1} aria-label={it.done ? 'Done' : 'Not done'} className="mt-1 accent-violet-500" /> : <span aria-hidden className="text-muted-foreground">•</span>}
                    <span className={it.done ? 'text-muted-foreground line-through' : undefined}>{inline(it.text, `${key}-${j}`)}</span>
                  </li>
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol key={key} className="list-decimal space-y-1 pl-5">
                {b.items.map((it, j) => (
                  <Fragment key={j}>
                    <li>{inline(it.text, `${key}-${j}`)}</li>
                  </Fragment>
                ))}
              </ol>
            )
        }
      })}
    </div>
  )
}
