/**
 * Export Data utility for Sanity Studio
 * Flexible data export with JSON/CSV support and relationship preservation
 */
import React from 'react';
import { SanityClient } from 'sanity';
interface ExportDataProps {
    client: SanityClient;
    documentTypes?: string[];
    format?: 'json' | 'csv';
    includeReferences?: boolean;
    maxDepth?: number;
    onComplete?: (results: {
        exported: number;
        format: string;
        filename: string;
    }) => void;
    onError?: (error: string) => void;
    maxDocuments?: number;
}
/**
 * Export Data component for flexible data export
 */
export declare const ExportData: React.FC<ExportDataProps>;
export default ExportData;
