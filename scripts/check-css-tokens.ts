/**
 * CI guard: the colour literals that now have palette tokens (see CSS-01) must
 * not creep back inline into components. Scoped to src/components/** (the token
 * definitions live in src/utils/theme.ts, intentionally excluded). Targeted at
 * the *tokenised* values — it does NOT ban every colour literal, so legitimate
 * inline values (white text, translucent whites, computed gradients) are fine.
 *
 * Run by `npm run check:css` (wired into CI).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const BANNED: { pattern: RegExp; fix: string }[] = [
  { pattern: /background:\s*['"`]#fff(?:fff)?['"`]/i, fix: 'use YB.surface' },
  { pattern: /#C9C4BA/i, fix: 'use YB.surfaceLine' },
  { pattern: /#181B1F/i, fix: 'use YB.ink' },
  {
    pattern: /rgba\(\s*20,\s*25,\s*40,\s*0\.(?:55|85)\s*\)/i,
    fix: 'use YB.backdrop.{light,heavy}',
  },
]

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory()
      ? walk(p)
      : p.endsWith('.tsx') || p.endsWith('.ts')
        ? [p]
        : []
  })
}

let violations = 0
for (const file of walk('src/components')) {
  if (/\.test\.tsx?$/.test(file)) continue
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    for (const { pattern, fix } of BANNED) {
      if (pattern.test(line)) {
        violations++
        console.error(`${file}:${i + 1}  raw colour literal — ${fix}`)
        console.error(`    ${line.trim()}`)
      }
    }
  })
}

if (violations > 0) {
  console.error(
    `\n✗ ${violations} tokenised colour literal(s) reappeared in src/components — use the YB.* token.`,
  )
  process.exit(1)
}
console.log('✓ no banned raw colour literals in src/components')
