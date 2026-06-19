// Reproducible asset harness: renders every assets/*.mmd Mermaid source to assets/*.svg
// Usage: npm run capture   (requires npx access to @mermaid-js/mermaid-cli)
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

// Resolve the package root from this script's location (scripts/ -> ..)
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS_DIR = join(ROOT, 'assets')
const CONFIG = join(ROOT, 'scripts', 'mermaid-config.json')

// Pinned Mermaid CLI version for deterministic, reproducible renders
const MMDC_PKG = '@mermaid-js/mermaid-cli@11.15.0'

// Render a single .mmd source to an .svg sibling
function renderDiagram(name) {
	const input = join(ASSETS_DIR, name)
	const output = join(ASSETS_DIR, name.replace(/\.mmd$/, '.svg'))
	console.log(`Rendering ${name} -> ${output.split('/').pop()}`)
	execFileSync(
		'npx',
		['--yes', MMDC_PKG, '-i', input, '-o', output, '-c', CONFIG, '-b', 'transparent'],
		{ stdio: 'inherit' }
	)
}

const sources = readdirSync(ASSETS_DIR).filter((f) => f.endsWith('.mmd'))
if (sources.length === 0) {
	console.warn('No .mmd sources found in assets/ — nothing to render')
	process.exit(0)
}
sources.forEach(renderDiagram)
console.log(`Rendered ${sources.length} diagram(s)`)
