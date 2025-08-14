# Sanity Export Data

A flexible data export utility for Sanity Studio that enables exporting any document types to JSON or CSV formats with advanced filtering, custom queries, and relationship preservation.

## Features

- 📄 **Multiple Formats**: Export to JSON or CSV with proper formatting
- 🎯 **Flexible Selection**: Export any document types or use custom GROQ queries
- 🔍 **Advanced Filtering**: Date filters, field filters, and custom criteria
- 🔗 **Reference Expansion**: Include referenced documents with configurable depth
- 📊 **Progress Tracking**: Real-time export progress with detailed feedback
- 🛡️ **Safe Operations**: Preview mode and validation before export
- 📱 **Responsive UI**: Seamless integration with Sanity Studio
- 💾 **Direct Download**: Files download directly to your computer

## Installation

```bash
npm install sanity-export-data
```

## Quick Start

### Basic Usage

```tsx
import React from 'react'
import { ExportData } from 'sanity-export-data'
import { useClient } from 'sanity'

const DataExporter = () => {
  const client = useClient({ apiVersion: '2023-01-01' })

  return (
    <ExportData
      client={client}
      onComplete={(results) => {
        console.log(`Exported ${results.exported} documents as ${results.filename}`)
      }}
    />
  )
}
```

### As a Sanity Studio Tool

```tsx
// sanity.config.ts
import { defineConfig } from 'sanity'
import { ExportDataTool } from 'sanity-export-data'

export default defineConfig({
  // ... other config
  tools: [
    ExportDataTool()
  ]
})
```

### With Specific Document Types

```tsx
<ExportData
  client={client}
  documentTypes={['post', 'author', 'category']}
  format="csv"
  includeReferences={true}
  maxDepth={2}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `client` | `SanityClient` | **required** | Sanity client instance |
| `documentTypes` | `string[]` | `[]` | Specific document types to export (empty = all types) |
| `format` | `'json' \| 'csv'` | `'json'` | Export format |
| `includeReferences` | `boolean` | `false` | Include referenced documents |
| `maxDepth` | `number` | `2` | Maximum reference expansion depth |
| `onComplete` | `function` | `undefined` | Callback when export completes |
| `onError` | `function` | `undefined` | Error handling callback |
| `maxDocuments` | `number` | `1000` | Maximum number of documents to export |

## Usage Examples

### 1. Basic JSON Export

```tsx
import { ExportData } from 'sanity-export-data'

const BasicExport = () => {
  const client = useClient({ apiVersion: '2023-01-01' })

  return (
    <ExportData
      client={client}
      documentTypes={['post', 'page']}
      format="json"
      onComplete={(results) => {
        console.log(`Exported ${results.exported} documents to ${results.filename}`)
      }}
    />
  )
}
```

### 2. CSV Export with References

```tsx
<ExportData
  client={client}
  documentTypes={['product']}
  format="csv"
  includeReferences={true}
  maxDepth={1}
  onComplete={(results) => {
    console.log(`CSV export complete: ${results.filename}`)
  }}
/>
```

### 3. Filtered Export by Date

```tsx
<ExportData
  client={client}
  documentTypes={['post']}
  // Component includes date filter UI
  onComplete={(results) => {
    console.log(`Exported ${results.exported} posts from date range`)
  }}
/>
```

### 4. Custom GROQ Query Export

```tsx
<ExportData
  client={client}
  // Component includes custom query UI
  // Example: *[_type == "post" && defined(publishedAt)]
  onComplete={(results) => {
    console.log(`Custom query exported ${results.exported} documents`)
  }}
/>
```

## Export Formats

### JSON Export

```json
[
  {
    "_id": "post-123",
    "_type": "post",
    "title": "My Blog Post",
    "slug": { "current": "my-blog-post" },
    "publishedAt": "2023-01-01T00:00:00Z",
    "author": {
      "_ref": "author-456",
      "_type": "reference"
    }
  }
]
```

### CSV Export

```csv
_id,_type,title,slug.current,publishedAt,author._ref
post-123,post,My Blog Post,my-blog-post,2023-01-01T00:00:00Z,author-456
```

## Advanced Features

### Reference Expansion

When `includeReferences` is enabled, referenced documents are included:

```json
{
  "_id": "post-123",
  "title": "My Post",
  "author": {
    "_id": "author-456",
    "name": "John Doe",
    "bio": "Writer and developer"
  },
  "references": [
    {
      "_id": "category-789",
      "title": "Technology"
    }
  ]
}
```

### Custom GROQ Queries

Advanced users can write custom queries:

```groq
*[_type == "post" && dateTime(publishedAt) > dateTime("2023-01-01")]
```

```groq
*[_type == "author" && defined(bio) && count(posts) > 5]
```

### Filtering Options

The component provides several filtering options:

- **Document Types**: Select specific document types
- **Date Range**: Filter by creation or modification date
- **Field Requirements**: Only export documents with specific fields
- **Custom Queries**: Write advanced GROQ queries

## Export Configuration

### File Naming

- **Auto-generated**: `sanity-export-[types]-[date].[format]`
- **Custom**: Specify your own filename
- **Examples**: 
  - `sanity-export-posts-2023-08-14.json`
  - `my-custom-export.csv`

### Size Limits

```tsx
<ExportData
  client={client}
  maxDocuments={500} // Limit export size
  onComplete={(results) => {
    if (results.exported === 500) {
      console.log('Export reached maximum limit')
    }
  }}
/>
```

### Progress Tracking

The component provides real-time progress updates:

1. **Preparing export** - Building query and validating
2. **Fetching documents** - Retrieving data from Sanity
3. **Processing data** - Formatting and preparing export
4. **Downloading file** - Generating and downloading file

## Performance Tips

### Large Datasets

- Use `maxDocuments` to limit export size
- Apply filters to reduce data scope
- Consider multiple smaller exports instead of one large export

### Reference Expansion

```tsx
// Limit reference depth for performance
<ExportData
  client={client}
  includeReferences={true}
  maxDepth={1} // Only expand one level
/>
```

### Memory Optimization

- CSV format uses less memory than JSON for large datasets
- Disable reference expansion for simple exports
- Use field filters to export only needed data

## Use Cases

### Data Migration

```tsx
// Export all content for migration
<ExportData
  client={client}
  format="json"
  includeReferences={true}
  maxDepth={3}
/>
```

### Analytics and Reporting

```tsx
// Export for analysis in Excel/Google Sheets
<ExportData
  client={client}
  documentTypes={['order', 'customer']}
  format="csv"
/>
```

### Backup and Archive

```tsx
// Regular backup export
<ExportData
  client={client}
  format="json"
  includeReferences={true}
  onComplete={(results) => {
    // Upload to backup service
  }}
/>
```

### Content Audit

```tsx
// Export for content review
<ExportData
  client={client}
  documentTypes={['post', 'page']}
  format="csv"
  // Filter by date range in UI
/>
```

## Requirements

- Sanity Studio v3+
- React 18+
- @sanity/ui v1+
- TypeScript 4.5+ (optional)

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to help improve this utility.