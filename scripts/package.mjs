#!/usr/bin/env node
/**
 * Verifies dist/ and zips it as release/DeluluTab-v<version>.zip, ready for "Load unpacked"
 * (after unzipping) or for upload to the Chrome Web Store.
 *
 *   npm run package        build, verify, zip
 *   npm run verify:dist    verify the existing dist/ only
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { unzipSync, zipSync } from 'fflate'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argValue = (flag) => {
  const i = process.argv.indexOf(flag)
  return i > -1 ? path.resolve(process.argv[i + 1]) : null
}
// --dist / --out exist so the verifier itself can be tested against deliberately broken copies.
const distDir = argValue('--dist') ?? path.join(root, 'dist')
const releaseDir = argValue('--out') ?? path.join(root, 'release')
const checkOnly = process.argv.includes('--check-only')

const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
const problems = []
const fail = (msg) => problems.push(msg)

const fmtKB = (n) => `${(n / 1024).toFixed(1)} KB`

/** Every file under dir, as posix-style paths relative to it. Hidden files (.DS_Store, ...) are skipped. */
function walk(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('.')) return []
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full, base) : [path.relative(base, full).split(path.sep).join('/')]
  })
}

function pngSize(file) {
  const buf = readFileSync(file)
  const isPng = buf.length > 24 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  return isPng ? { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) } : null
}

// ---------------------------------------------------------------- verify
if (!existsSync(path.join(distDir, 'manifest.json'))) {
  console.error('dist/manifest.json not found. Run "npm run build" first.')
  process.exit(1)
}

const files = walk(distDir)
const manifest = JSON.parse(readFileSync(path.join(distDir, 'manifest.json'), 'utf8'))

if (manifest.manifest_version !== 3) fail(`manifest_version must be 3 (got ${manifest.manifest_version})`)
if (!manifest.name) fail('manifest.name is missing')
if (!manifest.description || manifest.description.length > 132) fail('manifest.description must exist and be at most 132 characters (Web Store limit)')
if (!/^\d+(\.\d+){0,3}$/.test(manifest.version ?? '')) fail(`manifest.version "${manifest.version}" is not a valid Chrome version`)
if (manifest.version !== pkg.version) fail(`manifest.version (${manifest.version}) does not match package.json (${pkg.version}); rebuild`)

const newtab = manifest.chrome_url_overrides?.newtab
if (!newtab) fail('manifest.chrome_url_overrides.newtab is missing')
else if (!files.includes(newtab)) fail(`new tab page "${newtab}" is not in dist/`)

for (const [size, rel] of Object.entries(manifest.icons ?? {})) {
  if (!files.includes(rel)) {
    fail(`icon ${size}: "${rel}" is not in dist/`)
    continue
  }
  const dims = pngSize(path.join(distDir, rel))
  if (!dims) fail(`icon ${size}: "${rel}" is not a PNG`)
  else if (dims.width !== Number(size) || dims.height !== Number(size)) fail(`icon ${size}: "${rel}" is ${dims.width}x${dims.height}`)
}
if (!manifest.icons?.['128']) fail('a 128x128 icon is required by the Web Store')

// Permissions: keep this list deliberate. Anything new should be justified in RELEASING.md.
//   storage, unlimitedStorage  settings, notes, uploaded wallpapers
//   tabs                       read tab titles and URLs when you press "Save tabs" (tab stash)
//   alarms, notifications      finish a focus session and notify you even when no new tab is open
const ALLOWED = new Set(['storage', 'unlimitedStorage', 'tabs', 'alarms', 'notifications', 'identity'])
for (const p of manifest.permissions ?? []) if (!ALLOWED.has(p)) fail(`unexpected permission "${p}" (allowed: ${[...ALLOWED].join(', ')})`)
// News and quote feeds do not send CORS headers, so the extension page needs these hosts.
const ALLOWED_HOSTS = new Set([
  'https://techcrunch.com/*',
  'https://www.theverge.com/*',
  'https://feeds.arstechnica.com/*',
  'https://www.theguardian.com/*',
  'https://www.technologyreview.com/*',
  'https://feeds.bbci.co.uk/*',
  'https://www.bbc.co.uk/*',
  'https://www.bbc.com/*',
  'https://hnrss.org/*',
  'https://www.nasa.gov/*',
  'https://www.cnbc.com/*',
  'https://zenquotes.io/*',
  'https://quotable.vercel.app/*',
])
for (const host of manifest.host_permissions ?? []) if (!ALLOWED_HOSTS.has(host)) fail(`unexpected host permission "${host}"`)

// The service worker: present, and self-contained (it must not drag in the app, which needs a DOM).
const worker = manifest.background?.service_worker
if (manifest.background && !worker) fail('manifest.background has no service_worker')
if (worker) {
  if (!files.includes(worker)) fail(`service worker "${worker}" is not in dist/`)
  else {
    const seen = new Set()
    const visit = (file) => {
      if (seen.has(file) || !files.includes(file)) return
      seen.add(file)
      const src = readFileSync(path.join(distDir, file), 'utf8')
      if (/createRoot|getElementById\(/.test(src)) fail(`the service worker imports ${file}, which touches the DOM (it would crash in a worker)`)
      for (const [, spec] of src.matchAll(/(?:from|import)\s*["'](\.[^"']+)["']/g)) visit(path.posix.normalize(path.posix.join(path.posix.dirname(file), spec)))
    }
    visit(worker)
  }
}

// Everything index.html loads must be in the package.
const htmlFile = path.join(distDir, 'index.html')
if (!existsSync(htmlFile)) fail('index.html is missing from dist/')
else {
  const html = readFileSync(htmlFile, 'utf8')
  for (const [, ref] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(https?:)?\/\//.test(ref)) fail(`index.html loads a remote resource: ${ref} (extension pages may only load local scripts)`)
    else if (!files.includes(path.posix.normalize(ref))) fail(`index.html references "${ref}" which is not in dist/`)
  }
  if (/<script(?![^>]*\bsrc=)[^>]*>/.test(html)) fail('index.html contains an inline <script>, which the extension CSP blocks')
}

// Nothing that should not ship.
for (const f of files) if (/\.map$/.test(f)) fail(`source map in package: ${f}`)
for (const f of files.filter((x) => x.endsWith('.js'))) {
  const src = readFileSync(path.join(distDir, f), 'utf8')
  if (/sourceMappingURL=/.test(src)) fail(`${f} references a source map`)
  if (/https?:\/\/(localhost|127\.0\.0\.1)/.test(src)) fail(`${f} contains a localhost URL`)
  if (/\bdebugger\b/.test(src.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, ''))) fail(`${f} contains a debugger statement`)
}

// Every chunk in assets/ should be reachable: loaded by index.html or imported by another chunk.
const jsFiles = files.filter((f) => f.endsWith('.js'))
const cssFiles = files.filter((f) => f.endsWith('.css')) // fonts and images are referenced from stylesheets
const referenced = new Set()
for (const f of ['index.html', ...jsFiles, ...cssFiles].filter((x) => files.includes(x))) {
  const text = readFileSync(path.join(distDir, f), 'utf8')
  for (const other of files) if (other !== f && text.includes(path.posix.basename(other))) referenced.add(other)
}
for (const f of files.filter((x) => x.startsWith('assets/')))
  if (!referenced.has(f)) fail(`orphaned file in assets/: ${f}`)

const totalBytes = files.reduce((sum, f) => sum + statSync(path.join(distDir, f)).size, 0)

if (problems.length) {
  console.error(`\n✗ dist/ failed verification (${problems.length}):`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}

console.log(`✓ dist/ verified: ${manifest.name} v${manifest.version}, ${files.length} files, ${fmtKB(totalBytes)}`)
console.log(`  permissions: ${(manifest.permissions ?? []).join(', ') || 'none'}`)
if (checkOnly) process.exit(0)

// ---------------------------------------------------------------- zip
// Fixed timestamps make the archive reproducible: the same dist/ always yields the same bytes.
const MTIME = new Date('2026-01-01T00:00:00Z')
const entries = {}
for (const f of [...files].sort()) entries[f] = [new Uint8Array(readFileSync(path.join(distDir, f))), { mtime: MTIME, level: 9 }]

const zip = zipSync(entries)
mkdirSync(releaseDir, { recursive: true })
const zipName = `DeluluTab-v${pkg.version}.zip`
const zipPath = path.join(releaseDir, zipName)
writeFileSync(zipPath, zip)

// Read it back and compare every file byte-for-byte, so a corrupt archive can't slip out.
const back = unzipSync(new Uint8Array(readFileSync(zipPath)))
const names = Object.keys(back)
if (names.length !== files.length) {
  console.error(`✗ zip has ${names.length} entries, expected ${files.length}`)
  process.exit(1)
}
for (const f of files) {
  if (!back[f] || Buffer.compare(Buffer.from(back[f]), readFileSync(path.join(distDir, f))) !== 0) {
    console.error(`✗ zip entry differs from dist/: ${f}`)
    process.exit(1)
  }
}
if (!back['manifest.json']) {
  console.error('✗ manifest.json must be at the root of the zip')
  process.exit(1)
}

const sha = createHash('sha256').update(zip).digest('hex')
console.log(`\n✓ ${path.relative(root, zipPath)}`)
console.log(`  ${files.length} files, ${fmtKB(zip.length)} zipped (${fmtKB(totalBytes)} unpacked)`)
console.log(`  sha256 ${sha}`)
console.log('\nLoad it in Chrome (chrome://extensions) or Brave (brave://extensions): unzip, turn on Developer mode, Load unpacked.')
console.log('This build is not published to the Chrome Web Store. Firefox is not supported yet.')
