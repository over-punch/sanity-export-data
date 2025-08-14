/**
 * Export Data utility for Sanity Studio
 * Flexible data export with JSON/CSV support and relationship preservation
 */

import React, { useState, useCallback } from 'react'
import {
  Card,
  Stack,
  Text,
  Button,
  Box,
  Flex,
  Badge,
  Grid,
  Select,
  Checkbox,
  Progress,
  TextInput,
  TextArea
} from '@sanity/ui'
import { DownloadIcon, DocumentIcon, RefreshIcon } from '@sanity/icons'
import { SanityClient } from 'sanity'

// Types
interface ExportDataProps {
  client: SanityClient
  documentTypes?: string[]
  format?: 'json' | 'csv'
  includeReferences?: boolean
  maxDepth?: number
  onComplete?: (results: { exported: number; format: string; filename: string }) => void
  onError?: (error: string) => void
  maxDocuments?: number
}

interface DocumentData {
  _id: string
  _type: string
  _createdAt: string
  _updatedAt: string
  [key: string]: any
}

/**
 * Export Data component for flexible data export
 */
export const ExportData: React.FC<ExportDataProps> = ({
  client,
  documentTypes = [],
  format = 'json',
  includeReferences = false,
  maxDepth = 2,
  onComplete,
  onError,
  maxDocuments = 1000
}) => {
  // State
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [availableTypes, setAvailableTypes] = useState<string[]>([])
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>(format)
  const [includeRefs, setIncludeRefs] = useState(includeReferences)
  const [refDepth, setRefDepth] = useState(maxDepth)
  const [customQuery, setCustomQuery] = useState('')
  const [useCustomQuery, setUseCustomQuery] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [fieldFilter, setFieldFilter] = useState('')
  const [exportCount, setExportCount] = useState(0)
  const [filename, setFilename] = useState('')

  // Load available document types on mount
  React.useEffect(() => {
    loadAvailableTypes()
  }, [])

  /**
   * Load available document types from the dataset
   */
  const loadAvailableTypes = useCallback(async () => {
    try {
      const types = documentTypes.length > 0 
        ? documentTypes 
        : await client.fetch(`array::unique(*[]._type)`)
      
      setAvailableTypes(types.filter(Boolean))
      if (types.length > 0) {
        setSelectedTypes([types[0]])
      }
    } catch (error) {
      console.error('Error loading document types:', error)
      onError?.('Failed to load document types')
    }
  }, [client, documentTypes, onError])

  /**
   * Build export query based on selected parameters
   */
  const buildExportQuery = useCallback(() => {
    if (useCustomQuery && customQuery.trim()) {
      return customQuery
    }

    let query = '*['
    const conditions = []

    // Document type filter
    if (selectedTypes.length > 0) {
      conditions.push(`_type in [${selectedTypes.map(t => `"${t}"`).join(', ')}]`)
    }

    // Date filter
    if (dateFilter.trim()) {
      conditions.push(`dateTime(_createdAt) >= dateTime("${dateFilter}")`)
    }

    // Field filter (basic existence check)
    if (fieldFilter.trim()) {
      const fields = fieldFilter.split(',').map(f => f.trim()).filter(Boolean)
      if (fields.length > 0) {
        conditions.push(`(${fields.map(field => `defined(${field})`).join(' || ')})`)
      }
    }

    if (conditions.length > 0) {
      query += conditions.join(' && ')
    }

    query += `][0...${maxDocuments}]`

    // Add reference expansion if requested
    if (includeRefs && refDepth > 0) {
      query += ` {
        ...,
        ${buildReferenceExpansion(refDepth)}
      }`
    }

    return query
  }, [selectedTypes, dateFilter, fieldFilter, useCustomQuery, customQuery, maxDocuments, includeRefs, refDepth])

  /**
   * Build reference expansion query recursively
   */
  const buildReferenceExpansion = useCallback((depth: number): string => {
    if (depth <= 0) return ''
    
    const expansion = `
      "references": *[references(^._id)] {
        _id,
        _type,
        title,
        name,
        slug
      }`
    
    if (depth > 1) {
      return expansion + `,${buildReferenceExpansion(depth - 1)}`
    }
    
    return expansion
  }, [])

  /**
   * Convert data to CSV format
   */
  const convertToCSV = useCallback((data: DocumentData[]) => {
    if (data.length === 0) return ''

    // Get all unique keys from all documents
    const allKeys = new Set<string>()
    data.forEach(doc => {
      Object.keys(doc).forEach(key => {
        if (typeof doc[key] !== 'object' || doc[key] === null) {
          allKeys.add(key)
        }
      })
    })

    const headers = Array.from(allKeys)
    const csvRows = [headers.join(',')]

    data.forEach(doc => {
      const row = headers.map(header => {
        const value = doc[header]
        if (value === null || value === undefined) return ''
        if (typeof value === 'object') return JSON.stringify(value)
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return String(value)
      })
      csvRows.push(row.join(','))
    })

    return csvRows.join('\n')
  }, [])

  /**
   * Download file to user's computer
   */
  const downloadFile = useCallback((content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [])

  /**
   * Execute export operation
   */
  const handleExport = useCallback(async () => {
    if (selectedTypes.length === 0 && !useCustomQuery) {
      setMessage('Please select at least one document type or use a custom query')
      return
    }

    setIsExporting(true)
    setMessage('Preparing export...')
    setExportProgress(0)
    
    try {
      const query = buildExportQuery()
      console.log('Executing export query:', query)
      
      setMessage('Fetching documents...')
      setExportProgress(25)
      
      const documents: DocumentData[] = await client.fetch(query)
      setExportCount(documents.length)
      setExportProgress(50)
      
      if (documents.length === 0) {
        setMessage('No documents found matching the criteria')
        return
      }

      setMessage(`Processing ${documents.length} documents...`)
      setExportProgress(75)
      
      // Generate filename if not provided
      const timestamp = new Date().toISOString().split('T')[0]
      const typeString = selectedTypes.length > 0 ? selectedTypes.join('-') : 'custom'
      const generatedFilename = filename.trim() || `sanity-export-${typeString}-${timestamp}`
      
      let content: string
      let mimeType: string
      let finalFilename: string
      
      if (exportFormat === 'csv') {
        content = convertToCSV(documents)
        mimeType = 'text/csv'
        finalFilename = `${generatedFilename}.csv`
      } else {
        content = JSON.stringify(documents, null, 2)
        mimeType = 'application/json'
        finalFilename = `${generatedFilename}.json`
      }
      
      setMessage('Downloading file...')
      setExportProgress(90)
      
      downloadFile(content, finalFilename, mimeType)
      
      setExportProgress(100)
      setMessage(`Successfully exported ${documents.length} documents as ${finalFilename}`)
      
      onComplete?.({
        exported: documents.length,
        format: exportFormat,
        filename: finalFilename
      })
      
    } catch (error) {
      console.error('Export error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Export failed'
      setMessage(`Export error: ${errorMessage}`)
      onError?.(errorMessage)
    } finally {
      setIsExporting(false)
      setTimeout(() => setExportProgress(0), 2000)
    }
  }, [selectedTypes, useCustomQuery, buildExportQuery, client, exportFormat, filename, convertToCSV, downloadFile, onComplete, onError])

  /**
   * Toggle document type selection
   */
  const toggleTypeSelection = useCallback((type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }, [])

  /**
   * Select all document types
   */
  const selectAllTypes = useCallback(() => {
    setSelectedTypes([...availableTypes])
  }, [availableTypes])

  /**
   * Clear all selections
   */
  const clearAllTypes = useCallback(() => {
    setSelectedTypes([])
  }, [])

  return (
    <Card padding={4} radius={2} shadow={1}>
      <Stack space={4}>
        {/* Header */}
        <Flex align="center" gap={3}>
          <DownloadIcon />
          <Text size={2} weight="semibold">
            Export Data
          </Text>
        </Flex>

        {/* Export Configuration */}
        <Stack space={3}>
          {/* Document Types Selection */}
          {!useCustomQuery && (
            <Stack space={2}>
              <Flex justify="space-between" align="center">
                <Text size={1} weight="medium">Document Types</Text>
                <Flex gap={2}>
                  <Button text="Select All" onClick={selectAllTypes} mode="ghost" size={1} />
                  <Button text="Clear" onClick={clearAllTypes} mode="ghost" size={1} />
                </Flex>
              </Flex>
              <Grid columns={[2, 3, 4]} gap={2}>
                {availableTypes.map(type => (
                  <Checkbox
                    key={type}
                    checked={selectedTypes.includes(type)}
                    onChange={() => toggleTypeSelection(type)}
                  >
                    {type}
                  </Checkbox>
                ))}
              </Grid>
            </Stack>
          )}

          {/* Custom Query Option */}
          <Stack space={2}>
            <Checkbox
              checked={useCustomQuery}
              onChange={(event) => setUseCustomQuery(event.currentTarget.checked)}
            >
              Use custom GROQ query
            </Checkbox>
            
            {useCustomQuery && (
              <TextArea
                placeholder="Enter custom GROQ query...\ne.g. *[_type == 'post' && defined(publishedAt)]"
                value={customQuery}
                onChange={(event) => setCustomQuery(event.currentTarget.value)}
                rows={3}
              />
            )}
          </Stack>

          {/* Filters */}
          {!useCustomQuery && (
            <Grid columns={[1, 2]} gap={3}>
              <Stack space={2}>
                <Text size={1} weight="medium">Created After (YYYY-MM-DD)</Text>
                <TextInput
                  placeholder="e.g. 2023-01-01"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.currentTarget.value)}
                />
              </Stack>
              
              <Stack space={2}>
                <Text size={1} weight="medium">Required Fields (comma-separated)</Text>
                <TextInput
                  placeholder="e.g. title, slug, publishedAt"
                  value={fieldFilter}
                  onChange={(event) => setFieldFilter(event.currentTarget.value)}
                />
              </Stack>
            </Grid>
          )}

          {/* Export Options */}
          <Grid columns={[1, 2, 3]} gap={3}>
            <Stack space={2}>
              <Text size={1} weight="medium">Export Format</Text>
              <Select
                value={exportFormat}
                onChange={(event) => setExportFormat(event.currentTarget.value as 'json' | 'csv')}
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </Select>
            </Stack>
            
            <Stack space={2}>
              <Text size={1} weight="medium">Filename (optional)</Text>
              <TextInput
                placeholder="Auto-generated if empty"
                value={filename}
                onChange={(event) => setFilename(event.currentTarget.value)}
              />
            </Stack>
            
            <Stack space={2}>
              <Text size={1} weight="medium">Max Documents</Text>
              <TextInput
                type="number"
                value={maxDocuments.toString()}
                onChange={(event) => {
                  const value = parseInt(event.currentTarget.value) || 1000
                  // Update maxDocuments if needed - this would require prop drilling or state management
                }}
              />
            </Stack>
          </Grid>

          {/* Reference Options */}
          <Stack space={2}>
            <Checkbox
              checked={includeRefs}
              onChange={(event) => setIncludeRefs(event.currentTarget.checked)}
            >
              Include referenced documents
            </Checkbox>
            
            {includeRefs && (
              <Box paddingLeft={4}>
                <Stack space={2}>
                  <Text size={1} weight="medium">Reference Depth</Text>
                  <Select
                    value={refDepth.toString()}
                    onChange={(event) => setRefDepth(parseInt(event.currentTarget.value))}
                  >
                    <option value="1">1 level</option>
                    <option value="2">2 levels</option>
                    <option value="3">3 levels</option>
                  </Select>
                </Stack>
              </Box>
            )}
          </Stack>

          {/* Export Button */}
          <Button
            text="Export Data"
            icon={DownloadIcon}
            onClick={handleExport}
            loading={isExporting}
            tone="primary"
            disabled={selectedTypes.length === 0 && !useCustomQuery}
          />
        </Stack>

        {/* Progress and Status */}
        {isExporting && exportProgress > 0 && (
          <Box>
            <Progress value={exportProgress} />
            <Text size={1} muted style={{ marginTop: '8px' }}>
              {message}
            </Text>
          </Box>
        )}

        {/* Status Message */}
        {message && !isExporting && (
          <Card padding={3} tone={message.includes('error') ? 'critical' : 'positive'}>
            <Flex align="center" gap={2}>
              <DocumentIcon />
              <Text size={1}>{message}</Text>
              {exportCount > 0 && (
                <Badge tone="primary">{exportCount} documents</Badge>
              )}
            </Flex>
          </Card>
        )}
      </Stack>
    </Card>
  )
}

export default ExportData