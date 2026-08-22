# @liiift-studio/sanity-export-data

> Pick document types, filter them, optionally pull in referencing documents, and download the result as CSV or JSON — straight from a Sanity Studio panel.

[![npm](https://img.shields.io/npm/v/@liiift-studio/sanity-export-data.svg)](https://www.npmjs.com/package/@liiift-studio/sanity-export-data)
[![license](https://img.shields.io/npm/l/@liiift-studio/sanity-export-data.svg)](https://www.npmjs.com/package/@liiift-studio/sanity-export-data)
[![Sanity Studio v3–v6](https://img.shields.io/badge/Sanity%20Studio-v3%20%E2%80%93%20v6-blue.svg)](https://www.sanity.io)

`ExportData` is a single React component for Sanity Studio. An editor selects one or
more document types (discovered from the dataset, or constrained by you), optionally
narrows by creation date, field presence, or a hand-written GROQ query, chooses CSV or
JSON, and the matching documents download to their machine. No scripting, no API tokens
to hand around — it runs inside Studio with the signed-in user's session.

> ⚠️ **Read this if you are upgrading or were following an earlier version of this
> README.** Earlier revisions of these docs described a different implementation — a
> foundry-specific panel with a fixed type dropdown and `client` / `displayName` / `icon`
> props. **That component is not what npm ships.** The published bundle is built from
> `src/ExportData.tsx` and has the props documented below. See
> [Two implementations under `src/`](#maintainer-note--two-implementations-under-src)
> for why the mix-up is easy to make, and
> [The foundry-specific variant](#the-foundry-specific-variant-srcexportdatajsx) for the
> older component, which still lives in the repo.

## How it works

<img src="https://raw.githubusercontent.com/Liiift-Studio/sanity-export-data/main/assets/export-flow.svg?v=2" alt="Data-flow diagram: ExportData either uses the documentTypes prop or discovers types with array::unique on _type; the editor picks types plus optional date and field filters, or supplies a custom GROQ query; the query is fetched with a maxDocuments slice, optionally appending a reverse references lookup; results are serialised to CSV or JSON and saved via a Blob object URL as sanity-export-types-date.csv or .json" width="420" />

1. **Discover types.** On mount the component lists the types you can export. If you
   passed `documentTypes`, that list is used verbatim; otherwise it queries the dataset
   with `array::unique(*[]._type)`.
2. **Filter.** Select one or more types, then optionally narrow by creation date
   (`dateTime(_createdAt) >= …`) and by field presence (a comma-separated list becomes
   `defined(a) || defined(b)`). Advanced users can flip on **custom GROQ** and supply a
   query directly, which bypasses all of the above.
3. **Include references (optional).** Ticking this appends a **reverse** lookup —
   `"references": *[references(^._id)]{ _id, _type, title, name, slug }` — so each
   exported document carries a summary of the documents that **point at it**.
4. **Export.** Choose CSV or JSON, then download. The file is built as a `Blob` and
   saved through an object URL. The default filename is
   `sanity-export-<joined-types>-<YYYY-MM-DD>.<ext>` (e.g.
   `sanity-export-post-page-2026-08-21.json`); you can override it in the panel.

## Install

```bash
npm install @liiift-studio/sanity-export-data
```

The package ships an ESM bundle and declares peer dependencies on `sanity`,
`@sanity/ui`, `@sanity/icons`, and `react` — all of which a Studio already has. **One
build covers Sanity Studio v3 through v6**; see [Compatibility](#compatibility) for the
exact ranges and why `@sanity/ui` is capped below v5.

## Quick start

`ExportData` is available as both the **default** and a **named** export. The only
required prop is a Sanity client:

```jsx
import ExportData from '@liiift-studio/sanity-export-data'
// or: import { ExportData } from '@liiift-studio/sanity-export-data'
import { useClient } from 'sanity'

function DataExporter() {
	const client = useClient({ apiVersion: '2023-01-01' })

	return <ExportData client={client} />
}
```

Constrain the type list and default the panel to CSV:

```jsx
<ExportData
	client={client}
	documentTypes={['post', 'page', 'author']}
	format="csv"
	maxDocuments={500}
	onComplete={({ exported, filename }) => {
		console.log(`Exported ${exported} documents to ${filename}`)
	}}
	onError={(message) => console.error('Export failed:', message)}
/>
```

### As a Studio tool

Wrap it in a [structure / dashboard / custom tool](https://www.sanity.io/docs/tools)
that can supply a client. A minimal custom tool:

```jsx
// sanity.config.js
import { defineConfig } from 'sanity'
import { useClient } from 'sanity'
import { DownloadIcon } from '@sanity/icons'
import ExportData from '@liiift-studio/sanity-export-data'

function ExportDataTool() {
	const client = useClient({ apiVersion: '2023-01-01' })
	return <ExportData client={client} />
}

export default defineConfig({
	// ...projectId, dataset, plugins, schema
	tools: (prev) => [
		...prev,
		{
			name: 'export-data',
			title: 'Export Data',
			icon: DownloadIcon,
			component: ExportDataTool,
		},
	],
})
```

> The component renders its own UI (type checkboxes, date and field filters, a custom
> GROQ box, format radios, a filename field, and a progress bar). It does not register
> itself as a tool — you mount it wherever a `client` is available.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `client` | `SanityClient` | **required** | Sanity client used for every `fetch`. Determines the dataset and the permissions the export runs under. |
| `documentTypes` | `string[]` | `[]` | Types offered in the panel. Empty means "discover every `_type` in the dataset". |
| `format` | `'json' \| 'csv'` | `'json'` | Format the panel starts on. The editor can still switch it. |
| `includeReferences` | `boolean` | `false` | Initial state of the "include references" toggle (see [Referencing documents](#referencing-documents)). |
| `maxDepth` | `number` | `2` | Reference-expansion depth the panel starts on. |
| `maxDocuments` | `number` | `1000` | Slice applied to the generated query (`[0...maxDocuments]`). |
| `onComplete` | `(results: { exported: number; format: string; filename: string }) => void` | `undefined` | Called after a successful download. |
| `onError` | `(error: string) => void` | `undefined` | Called when type discovery or the export fails. |

> `format`, `includeReferences`, and `maxDepth` seed the panel's initial UI state — they
> are **starting values, not locks**. The editor can change all three in the panel.
> `documentTypes` and `maxDocuments` genuinely constrain what a run can touch.

> **`displayName` and `icon` are not props of the published component.** They belong to
> the unshipped `.jsx` variant; passing them is silently ignored. Render your own
> heading around the component if you want one.

## What gets exported

### JSON

The raw documents as fetched, pretty-printed:

```json
[
	{
		"_id": "typeface-123",
		"_type": "typeface",
		"title": "Freight",
		"slug": { "current": "freight" }
	}
]
```

### CSV

One row per document, but note the **object-flattening rule**: a key is only included
in the header if its value is a **non-object** (scalar) in at least one document.
Object- and array-valued keys — `slug`, portable-text bodies, reference fields, the
`references` block — are **dropped from the header entirely**, so they do not appear in
the CSV at all.

```csv
_id,_type,title
typeface-123,typeface,Freight
```

Within a row, a value is quoted **only when the string contains a comma** (embedded `"`
is then doubled); everything else is written raw.

> **CSV is lossy here.** If you need nested data — slugs, references, arrays, portable
> text — **export JSON**. Reaching for CSV and finding your `slug` column missing is the
> single most common surprise with this tool.

### Referencing documents

Ticking **include references** does **not** dereference the document's own reference
fields. It appends a **reverse** lookup — every document that points **at** the exported
one — under a `references` key:

```json
{
	"_id": "typeface-123",
	"_type": "typeface",
	"title": "Freight",
	"references": [
		{ "_id": "order-88", "_type": "order", "title": "Order #88" },
		{ "_id": "pair-4", "_type": "pair", "name": "Freight + Grot" }
	]
}
```

Each entry is a **summary** — `_id`, `_type`, `title`, `name`, `slug` only — not the
full document.

> **`maxDepth` above 1 does not nest.** The depth parameter concatenates the *same*
> `references` projection repeatedly into one projection rather than nesting it, so
> values above `1` add duplicate keys instead of a second level. Leave it at `1` unless
> you are prepared to read the generated query.

## Filtering

Filters are set in the panel; the props only seed their initial values:

- **Types** — one or more, from the discovered or supplied list → `_type in ["a", "b"]`.
- **Created since** — a date → `dateTime(_createdAt) >= dateTime("…")`.
- **Fields present** — a comma-separated list → `(defined(a) || defined(b))`.
- **Custom GROQ** (toggle) — replaces the whole generated query with what you type.
- **Cap** — every generated query ends in `[0...maxDocuments]`.

> **Drafts are _not_ excluded.** The generated query has no `!(_id in path('drafts.**'))`
> guard, so draft documents matching your filters are exported alongside published ones.
> Add the guard yourself via the custom-GROQ box if you need published-only output.

## Use cases

- **Backups & archives** — pull a whole document type to JSON.
- **Reporting** — export orders or accounts to CSV for Excel or Google Sheets (scalar
  fields only — see the CSV caveat above).
- **Content audits** — list documents created since a date, or missing a required field.
- **Impact analysis** — use the reverse `references` lookup to see what points at a
  document before you change or retire it.

## Caveats & limits

- **CSV silently drops nested fields.** Object- and array-valued keys never reach the
  header. Use JSON when structure matters.
- **Drafts are included.** See the note under [Filtering](#filtering).
- **Memory, not data-URI, is the size ceiling.** The file is assembled as a string and
  handed to a `Blob` via `URL.createObjectURL`, so the old few-megabyte data-URI cap does
  **not** apply — but the whole result set is still held in browser memory. Lower
  `maxDocuments` for very large types.
- **GROQ is built from input.** Selected types, the date value, and the field list are
  interpolated straight into GROQ, and the custom-GROQ box is passed through verbatim.
  Everything runs as read-only `fetch`es under the signed-in user's permissions, but
  treat this as an internal admin tool, not something to expose to untrusted input.
- **Type discovery scans the dataset.** With no `documentTypes` prop, the component runs
  `array::unique(*[]._type)` on mount, which touches every document. On very large
  datasets, pass `documentTypes` explicitly to skip it.

## Compatibility

**One build supports Sanity Studio v3, v4, v5 and v6.**

| Peer | Declared range | Meaning |
|---|---|---|
| `sanity` | `>=3 <7` | Studio v3 through v6 |
| `@sanity/ui` | `>=2 <5` | v2, v3, v4 — `<5` is **not** a mistake |
| `@sanity/icons` | `>=2 <6` | v2 through v5 |
| `react` | `^18.0.0 \|\| ^19.0.0` | React 18 or 19 |

> **`@sanity/ui` is capped below v5 on purpose.** Studio v6 ships **`@sanity/ui` v4**,
> not v5, so `>=2 <5` is the correct range for a v6 Studio.

### How one build spans four Studio majors

Two upstream breaking changes make naive imports fail across these majors:

- **`@sanity/ui` v4** moved `Tooltip`, `Menu`, `MenuButton`, `MenuItem`, `Code`,
  `Popover`, `Autocomplete`, `Toast` and `useToast` out of the package root into
  **subpath entries**.
- **`@sanity/icons` v5** removed **every named `*Icon` export**.

The trap: **both packages still _declare_ the removed names in their `.d.ts`, typed
`never`**. A named import type-checks, compiles, and bundles cleanly — then throws at
runtime in the Studio. `tsc` and your bundler both call it fine.

You can see it in the shipped typings. `@sanity/icons@5.2.1`, `dist/index.d.ts`:

```ts
/**
 * @deprecated `TrashIcon` is no longer exported from the `@sanity/icons` root entry
 * (removed in v5) – the icon itself still exists. Import it from its own subpath
 * instead: `import {TrashIcon} from '@sanity/icons/Trash'`
 */
declare const TrashIcon: never;
```

`TrashIcon` is still listed in that file's root `export { … }` block, so
`import { TrashIcon } from '@sanity/icons'` resolves, type-checks as `never`, bundles —
and is `undefined` at runtime.

So this package **imports no `@sanity/ui` or `@sanity/icons` symbol directly**. Everything
routes through
[`@liiift-studio/sanity-ui-compat`](https://www.npmjs.com/package/@liiift-studio/sanity-ui-compat),
which resolves the *installed* namespace at runtime. That indirection — not a
version-matrix build — is what makes a single artifact work on v3 through v6. The compat
layer is a normal `dependencies` entry and is **bundled into `dist`**, so there is
nothing extra to install.

> **`Progress` is supplied by the compat layer, not by `@sanity/ui`.** The export
> progress bar uses `Progress`, which **has never been exported by `@sanity/ui`**
> (verified absent from the typings of the installed `@sanity/ui@4.0.5`).
> `sanity-ui-compat` implements it. If you vendor `src/` instead of consuming `dist`,
> keep importing `Progress` from the compat package.

### Verification status

v3–v6 support rests on the declared peer ranges, green builds, and use in **three
in-house Liiift Studio Studios**. It has **not** been exercised broadly in a running
Sanity 6 Studio beyond those. Treat v6 as supported-and-believed-good rather than
extensively field-tested.

### TypeScript

The published package **does not declare a `types` field**, so TypeScript consumers get
no bundled declarations and the import resolves as untyped. `src/` ships in the tarball
and `src/ExportData.tsx` carries the real `ExportDataProps` interface — use the
[Props](#props) table as the contract, or declare a local module shim.

## Maintainer note — two implementations under `src/`

The repo contains **two** implementations of the component:

| File | What it is | Shipped? |
|---|---|---|
| `src/ExportData.tsx` | The general-purpose component documented above | **Yes — this is what `dist` is built from** |
| `src/ExportData.jsx` | A foundry-specific panel (`client`, `displayName`, `icon` props) | **No — currently dead code** |

**Which one ships is easy to get wrong.** The `build` script's entry is `src/index.jsx`,
which looks like it selects the `.jsx` implementation — but that file only does
`export { default } from './ExportData'`, an **extensionless** specifier. esbuild's
default `--resolve-extensions` order is `.tsx,.ts,.jsx,.js,…`, so it resolves
**`ExportData.tsx`**.

Confirm it from the build output rather than taking it on trust:

```bash
head -1 dist/index.js   # => // src/ExportData.tsx
```

This is fragile: renaming or deleting `ExportData.tsx` would silently swap the published
component for the `.jsx` one, with entirely different props and no build error.
Reconcile the two sources — or make the entry point's extension explicit — before the
next publish.

### The foundry-specific variant (`src/ExportData.jsx`)

Preserved here because it is still in the repo and some Liiift foundry Studios vendor it
directly. **It is not what `npm install` gives you.**

It takes `client`, `displayName`, and `icon`; searches by title prefix
(`title match "name*"`, drafts excluded) with an optional *Excluding* filter; discovers
first-level reference fields (`_ref` and `_ref[]`) and offers a checkbox per field to
re-fetch them **dereferenced** (`field->{...}`); and downloads via a `data:` URI, which
browsers cap at a few megabytes. Its filename is `type-name-date.ext` using the browser's
`en-US` locale date.

Its document-type dropdown is a fixed foundry list — `typeface`, `collection`, `pair`,
`font`, `license`, `order`, `account`, `cart`, `page`, `blogpost` — and its results list
builds desk `href`s like `/desk/<type>;<id>` (with an `orderable-` prefix for `typeface`;
the code also handles `licenseGroup`, which is not in the dropdown). To adapt it, fork or
vendor the file and edit the `<Select>` `<option>` values and those desk paths to match
your schema.

## Diagram source

The data-flow diagram above is generated from a committed Mermaid source. To
regenerate after a change:

```bash
npm run capture   # renders assets/*.mmd -> assets/*.svg via @mermaid-js/mermaid-cli
```

## Part of the Liiift Sanity Tools suite

One of a family of Sanity Studio utilities by [Liiift Studio](https://liiift.studio), all
sharing the same v3–v6 compat approach:

| Package | Does |
|---|---|
| [`sanity-search-and-delete`](https://www.npmjs.com/package/@liiift-studio/sanity-search-and-delete) | Find documents and bulk-delete them |
| [`sanity-delete-unused-assets`](https://www.npmjs.com/package/@liiift-studio/sanity-delete-unused-assets) | Remove unreferenced image/file assets |
| [`sanity-duplicate-and-rename`](https://www.npmjs.com/package/@liiift-studio/sanity-duplicate-and-rename) | Bulk-duplicate documents with templated renaming |
| [`sanity-ui-compat`](https://www.npmjs.com/package/@liiift-studio/sanity-ui-compat) | The compat layer these tools import instead of `@sanity/ui` |

## License

MIT © Quinn Keaveney / Liiift Studio. See the [`license` field](package.json) in
`package.json`. No standalone `LICENSE` file is checked into the repo yet.

## Contributing

Issues and pull requests welcome at
[Liiift-Studio/sanity-export-data](https://github.com/Liiift-Studio/sanity-export-data).
