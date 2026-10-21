/** Starting points for a custom widget. The code runs in the sandbox, so it uses plain CSS. */
export interface WidgetTemplate {
  id: string
  name: string
  blurb: string
  html: string
  css: string
  js: string
}

const SANS = 'font-family: ui-sans-serif, system-ui, sans-serif;'

export const WIDGET_TEMPLATES: WidgetTemplate[] = [
  {
    id: 'line',
    name: 'A line',
    blurb: 'A short line of your own, set like a title card.',
    html: '<div class="card">\n  <p class="kicker">Today</p>\n  <p class="title">Make it yours.</p>\n  <p class="note">A quiet line for the new tab.</p>\n</div>\n',
    css: `.card {\n  ${SANS}\n  height: 100%;\n  box-sizing: border-box;\n  display: flex;\n  flex-direction: column;\n  justify-content: flex-end;\n  gap: 0.35rem;\n}\n.card::before {\n  content: "";\n  width: 2.4rem;\n  height: 3px;\n  margin-bottom: auto;\n  border-radius: 999px;\n  background: currentColor;\n}\n.kicker {\n  margin: 0;\n  font-size: 0.68rem;\n  letter-spacing: 0.18em;\n  text-transform: uppercase;\n  opacity: 0.5;\n}\n.title {\n  margin: 0;\n  max-width: 11ch;\n  font-size: 1.9rem;\n  font-weight: 600;\n  letter-spacing: -0.045em;\n  line-height: 0.95;\n}\n.note {\n  margin: 0.2rem 0 0;\n  max-width: 22ch;\n  font-size: 0.82rem;\n  line-height: 1.35;\n  opacity: 0.62;\n}\n`,
    js: '',
  },
  {
    id: 'links',
    name: 'Links',
    blurb: 'A few places you open often, as a small list.',
    html: '<nav class="list">\n  <a href="https://example.com/"><span class="mark"></span><span><strong>Reading</strong><small>example.com</small></span><span class="go">↗</span></a>\n  <a href="https://example.com/"><span class="mark"></span><span><strong>Notes</strong><small>example.com</small></span><span class="go">↗</span></a>\n  <a href="https://example.com/"><span class="mark"></span><span><strong>Inbox</strong><small>example.com</small></span><span class="go">↗</span></a>\n</nav>\n',
    css: `.list {\n  ${SANS}\n  height: 100%;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  gap: 0.4rem;\n}\n.list a {\n  display: flex;\n  align-items: center;\n  gap: 0.7rem;\n  padding: 0.45rem 0.6rem;\n  border-radius: 0.85rem;\n  color: inherit;\n  text-decoration: none;\n  background: color-mix(in srgb, currentColor 7%, transparent);\n}\n.list a:hover { background: color-mix(in srgb, currentColor 12%, transparent); }\n.mark {\n  width: 0.42rem;\n  height: 0.42rem;\n  flex: none;\n  border-radius: 999px;\n  background: currentColor;\n  opacity: 0.75;\n}\n.list strong {\n  display: block;\n  font-size: 0.92rem;\n  letter-spacing: -0.02em;\n}\n.list small {\n  display: block;\n  margin-top: 0.05rem;\n  font-size: 0.68rem;\n  opacity: 0.55;\n}\n.go {\n  margin-left: auto;\n  font-size: 0.85rem;\n  opacity: 0.45;\n}\n`,
    js: '',
  },
  {
    id: 'counter',
    name: 'Counter',
    blurb: 'A number you click up. A small example of JavaScript.',
    html: '<div class="card">\n  <p class="kicker">Tally</p>\n  <p class="count" id="n">0</p>\n  <button id="add" type="button">Add one</button>\n</div>\n',
    css: `.card {\n  ${SANS}\n  height: 100%;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  align-items: flex-start;\n}\n.kicker {\n  margin: 0;\n  font-size: 0.68rem;\n  letter-spacing: 0.18em;\n  text-transform: uppercase;\n  opacity: 0.5;\n}\n.count {\n  margin: 0.2rem 0 0.75rem;\n  font-size: 3.4rem;\n  font-weight: 600;\n  letter-spacing: -0.06em;\n  line-height: 0.85;\n  font-variant-numeric: tabular-nums;\n}\nbutton {\n  border: 1px solid color-mix(in srgb, currentColor 22%, transparent);\n  background: color-mix(in srgb, currentColor 10%, transparent);\n  color: inherit;\n  border-radius: 999px;\n  padding: 0.38rem 0.85rem;\n  font: inherit;\n  font-size: 0.78rem;\n  font-weight: 600;\n  cursor: pointer;\n}\nbutton:hover { background: color-mix(in srgb, currentColor 16%, transparent); }\n`,
    js: 'var n = 0\nvar count = document.getElementById(\'n\')\ndocument.getElementById(\'add\').addEventListener(\'click\', function () {\n  n += 1\n  count.textContent = String(n)\n})\n',
  },
]
