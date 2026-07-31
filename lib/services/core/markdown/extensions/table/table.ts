import {Extension, MarkdownToken} from '@changerawr/markdown';

/**
 * Table Extension for Changerawr Markdown
 *
 * Supports GFM-style tables with proper boundaries:
 *
 * | Header 1 | Header 2 |
 * |----------|----------|
 * | Cell 1   | Cell 2   |
 * | Cell 3   | Cell 4   |
 *
 * Tables end at blank line or non-table content
 *
 * Also supports alignment:
 * | Left | Center | Right |
 * |:-----|:------:|------:|
 * | L    | C      | R     |
 */

const tableExtension: Extension = {
    name: 'table',
    parseRules: [
        {
            name: 'table',
            // GFM-style tables: STRICT matching to avoid conflicts
            // Must have header row, separator row with ONLY dashes/colons/spaces/pipes, then optional data rows
            // Separator row must have at least 3 dashes per cell to be valid
            pattern: /^\|(?:[^\n|]+\|)+\s*\n\|(?:\s*:?-{3,}:?\s*\|)+\s*\n(?:\|(?:[^\n|]*\|)+\s*\n)*(?=\n|$)/m,
            render: (match): MarkdownToken => {
                const fullTable = match[0].trim();
                const lines = fullTable.split('\n').filter(line => line.trim());

                if (lines.length < 2) {
                    // Invalid table: need at least header + separator
                    return {
                        type: 'table',
                        content: fullTable,
                        raw: match[0],
                        attributes: {
                            headers: '',
                            alignments: '',
                            rowCount: 0,
                            columnCount: 0,
                            bodyRows: '[]'
                        }
                    };
                }

                // First line is headers
                const headerRow = lines[0];
                const headers = headerRow
                    .split('|')
                    .map(h => h.trim())
                    .filter(h => h.length > 0);

                // Second line is separator with optional alignment
                const separatorLine = lines[1];
                const alignments = separatorLine
                    .split('|')
                    .map(sep => sep.trim())
                    .filter(sep => sep.length > 0)
                    .map(sep => {
                        if (sep.startsWith(':') && sep.endsWith(':')) return 'center';
                        if (sep.endsWith(':')) return 'right';
                        if (sep.startsWith(':')) return 'left';
                        return 'left';
                    });

                // Remaining lines are data rows
                const rows = lines.slice(2).map(row =>
                    row
                        .split('|')
                        .map(cell => cell.trim())
                        .filter(cell => cell.length > 0)
                );

                return {
                    type: 'table',
                    content: fullTable,
                    raw: match[0],
                    attributes: {
                        headers: headers.join('||'),
                        alignments: alignments.join('||'),
                        rowCount: rows.length,
                        columnCount: headers.length,
                        bodyRows: JSON.stringify(rows)
                    }
                };
            }
        }
    ],
    renderRules: [
        {
            type: 'table',
            render: (token): string => {
                const headers = (token.attributes?.headers as string)?.split('||') || [];
                const alignments = (token.attributes?.alignments as string)?.split('||') || [];
                const bodyRowsJson = token.attributes?.bodyRows as string;
                const bodyRows = bodyRowsJson ? JSON.parse(bodyRowsJson) : [];

                // Build table HTML using shadcn/ui table structure
                let html = '<div class="relative w-full overflow-auto my-4">';
                html += '<table class="w-full caption-bottom text-sm">';

                // Header row
                html += '<thead class="[&_tr]:border-b">';
                html += '<tr class="border-b transition-colors hover:bg-muted/50">';
                headers.forEach((header, idx) => {
                    const align = alignments[idx] || 'left';
                    const textAlign =
                        align === 'center' ? 'text-center' :
                            align === 'right' ? 'text-right' :
                                'text-left';
                    html += `<th class="h-12 px-4 ${textAlign} align-middle font-medium text-muted-foreground">${header}</th>`;
                });
                html += '</tr>';
                html += '</thead>';

                // Body rows
                html += '<tbody class="[&_tr:last-child]:border-0">';
                bodyRows.forEach((row: string[]) => {
                    html += '<tr class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">';
                    row.forEach((cell, cellIdx) => {
                        const align = alignments[cellIdx] || 'left';
                        const textAlign =
                            align === 'center' ? 'text-center' :
                                align === 'right' ? 'text-right' :
                                    'text-left';
                        html += `<td class="p-4 ${textAlign} align-middle">${cell}</td>`;
                    });
                    html += '</tr>';
                });
                html += '</tbody>';

                html += '</table></div>';
                return html;
            }
        }
    ]
};

export {tableExtension};