# @liiift-studio/sanity-export-data

> Search your Sanity content by name and type, optionally populate references, and download it as CSV or JSON — straight from a Sanity Studio panel.

[![npm](https://img.shields.io/npm/v/@liiift-studio/sanity-export-data.svg)](https://www.npmjs.com/package/@liiift-studio/sanity-export-data)
[![license](https://img.shields.io/npm/l/@liiift-studio/sanity-export-data.svg)](https://www.npmjs.com/package/@liiift-studio/sanity-export-data)
[![Sanity](https://img.shields.io/badge/Sanity-v3%20%7C%20v4%20%7C%20v5-blue.svg)](https://www.sanity.io)

`ExportData` is a single React component for Sanity Studio. An editor types a name,
picks a document type, ticks which referenced documents to expand, chooses CSV or
JSON, and the matching documents download to their machine. No GROQ, no scripting,
no API tokens to hand around — it runs inside Studio with the signed-in user's
session.

> **Heads up — this is a focused, foundry-oriented tool.** The document-type
> dropdown is a fixed list (`typeface`, `collection`, `pair`, `font`, `license`,
> `order`, `account`, `cart`, `page`, `blogpost`) and the result links assume a
> typeface-foundry desk structure. It is published for reuse across Liiift Studio
> foundry projects; adapt the type list (see [Adapting it](#adapting-it)) if your
> schema differs.

## How it works

<img src="https://raw.githubusercontent.com/Liiift-Studio/sanity-export-data/main/assets/export-flow.svg?v=1" alt="Data-flow diagram: an editor types a name and picks a document type, ExportData runs a title-match GROQ query (with an optional exclude filter and drafts excluded), auto-discovers first-level reference fields, optionally re-fetches with dereferenced references, then serialises the documents to CSV or JSON and downloads them as type-name-date.csv or .json" width="420" />

1. **Search.** As you type a name and pick a type, the component runs a
   `title match "name*"` GROQ query (drafts excluded), with an optional
   *Excluding* filter.
2. **Discover references.** It scans the first level of each result for reference
   fields (`_ref`) and arrays of references (`_ref[]`), and offers a checkbox per
   field.
3. **Populate (optional).** Tick references to re-fetch them dereferenced
   (`field->{...}`) so the export contains the full referenced documents, not just
   `_ref` pointers.
4. **Export.** Choose CSV or JSON, then download. The filename is
   `type-name-date.ext` (the `-name` segment is dropped when the search box is
   empty, and `date` is the browser's `en-US` locale date, e.g.
   `typeface-Freight-6/19/2026.csv`).

## Install

```bash
npm install @liiift-studio/sanity-export-data
```

The package ships an ESM bundle and declares these peer dependencies — install/keep
them in your Studio:

| Peer dependency | Supported range |
|---|---|
| `sanity` | `^3.0.0 \|\| ^4.0.0 \|\| ^5.0.0` |
| `react` | `^18.0.0 \|\| ^19.0.0` |
| `@sanity/ui` | `^1.0.0 \|\| ^2.0.0 \|\| ^3.0.0` |
| `@sanity/icons` | `^2.0.0 \|\| ^3.0.0` |

## Quick start

`ExportData` is the **default export**. Give it a Sanity client and a `displayName`
(and optionally an `icon`):

```jsx
import ExportData from '@liiift-studio/sanity-export-data'
import { useClient } from 'sanity'
import { DownloadIcon } from '@sanity/icons'

function DataExporter() {
	const client = useClient({ apiVersion: '2023-01-01' })

	return (
		<ExportData
			client={client}
			displayName="Export Data"
			icon={DownloadIcon}
		/>
	)
}
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
	return <ExportData client={client} displayName="Export Data" icon={DownloadIcon} />
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

> The component renders its own UI (search box, type dropdown, reference checkboxes,
> format radios, results list). It does not register itself as a tool — you mount it
> wherever a `client` is available.

## Props

The shipped component accepts exactly three props:

| Prop | Type | Required | Description |
|---|---|---|---|
| `client` | `SanityClient` | **yes** | Sanity client used for all `fetch` calls. |
| `displayName` | `string` | no | Heading shown above the panel. |
| `icon` | `React.ComponentType` | no | Icon rendered beside the heading (e.g. a `@sanity/icons` icon). |

There are no `format`, `documentTypes`, `includeReferences`, `maxDepth`,
`onComplete`, or `onError` props — the format, types, references, and filters are
all chosen interactively in the panel.

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

One row per document. The header is the union of all top-level keys across the
result set; string and object/array values are wrapped in quotes (objects are
JSON-stringified, embedded `"` doubled), while numbers and booleans are written
raw:

```csv
_id,_type,title,slug
"typeface-123","typeface","Freight","{""current"":""freight""}"
```

### Populated references

When you tick a reference field, that field is re-fetched dereferenced, so the
export carries the full referenced document inline instead of a `{ _ref }` pointer:

```json
{
	"_id": "typeface-123",
	"_type": "typeface",
	"title": "Freight",
	"foundry": {
		"_id": "foundry-9",
		"title": "Darden Studio"
	}
}
```

Only **first-level** reference fields discovered in the search results are offered;
reference expansion is one level deep.

## Filtering

All filtering happens in the panel — there are no filter props:

- **Name** — the title prefix to match (`title match "name*"`).
- **Type** — one document type from the dropdown.
- **Excluding** (toggle) — adds `&& !(title match "*exclude*")` to drop unwanted
  matches.
- **Drafts** are always excluded (`!(_id in path('drafts.**'))`).

## Use cases

- **Backups & archives** — pull a typeface, collection, or order set to JSON.
- **Migration** — export documents with references populated for re-import elsewhere.
- **Reporting** — export orders/accounts to CSV for Excel or Google Sheets.
- **Content audits** — list and export a type filtered by name.

## Caveats & limits

- **Download size.** Files are delivered via a `data:` URI and a synthetic
  `<a download>` click. Browsers cap data-URI length (often a few MB), so very large
  result sets can fail or truncate — narrow the search or export in batches.
- **Title-based search only.** A document must match `title match "name*"` to appear;
  there is no full-dataset "export everything" button.
- **GROQ is built from input.** The query interpolates the typed name, exclude value,
  and selected type directly into GROQ. It runs read-only `fetch`es under the
  signed-in user's permissions, but treat it as an internal admin tool rather than
  untrusted input.
- **Foundry-specific defaults.** The type list and result-link desk paths assume a
  typeface-foundry schema — see below to adapt.

## Adapting it

The document-type list and the desk-link paths are defined inline in
`src/ExportData.jsx`:

- The `<Select>` `<option>` values are the available types.
- The results list builds `href`s like `/desk/<type>;<id>` (with an `orderable-`
  prefix for `typeface`; the code also handles `licenseGroup`, which is not in the
  default dropdown).

Fork or vendor the file and edit those to match your schema and desk structure.

## Compatibility

- Sanity Studio **v3, v4, or v5**
- React **18 or 19**
- `@sanity/ui` **v1, v2, or v3**, `@sanity/icons` **v2 or v3**

## Diagram source

The data-flow diagram above is generated from a committed Mermaid source. To
regenerate after a change:

```bash
npm run capture   # renders assets/*.mmd -> assets/*.svg via @mermaid-js/mermaid-cli
```

## License

MIT © Quinn Keaveney / Liiift Studio. See the [`license` field](package.json) in
`package.json`.

## Contributing

Issues and pull requests welcome at
[Liiift-Studio/sanity-export-data](https://github.com/Liiift-Studio/sanity-export-data).
