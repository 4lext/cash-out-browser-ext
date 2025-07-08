/**
 * Table converter
 */

import { MarkdownBuilder } from '../markdown-builder.js';
import type { ElementLike } from '@/types/dom.js';

export function convertTable(element: ElementLike, builder: MarkdownBuilder): void {
  const rows = extractTableData(element);
  
  if (rows.length === 0) {
    return;
  }
  
  // Check if table is too complex (>5 columns)
  const maxColumns = Math.max(...rows.map(row => row.length));
  
  if (maxColumns > 5) {
    // Convert to structured list for better readability
    convertTableToList(rows, builder);
    return;
  }
  
  // Build markdown table
  builder.addBlankLine();
  
  // Normalize column count
  const columnCount = maxColumns;
  
  // Process header row if exists
  let dataStartIndex = 0;
  const firstRow = rows[0];
  if (!firstRow) return;
  
  const isHeader = firstRow.every(cell => cell.isHeader);
  
  if (isHeader) {
    // Add header row
    builder.add('| ');
    for (let i = 0; i < columnCount; i++) {
      const cell = firstRow[i];
      builder.add(cell ? escapeTableCell(cell.text) : '');
      builder.add(' | ');
    }
    builder.addLine();
    
    // Add separator
    builder.add('| ');
    for (let i = 0; i < columnCount; i++) {
      builder.add('---');
      builder.add(' | ');
    }
    builder.addLine();
    
    dataStartIndex = 1;
  }
  
  // Add data rows
  for (let i = dataStartIndex; i < rows.length; i++) {
    const row = rows[i];
    builder.add('| ');
    
    for (let j = 0; j < columnCount; j++) {
      const cell = row?.[j];
      builder.add(cell ? escapeTableCell(cell.text) : '');
      builder.add(' | ');
    }
    
    builder.addLine();
  }
  
  builder.addBlankLine();
}

/**
 * Extract table data into a structured format
 */
function extractTableData(element: ElementLike): TableCell[][] {
  const rows: TableCell[][] = [];
  
  // Process thead
  const thead = element.querySelector('thead');
  if (thead) {
    const headerRows = thead.querySelectorAll('tr');
    const headerRowsArray = Array.isArray(headerRows) ? headerRows : Array.from(headerRows);
    for (const row of headerRowsArray) {
      rows.push(extractRowData(row as ElementLike, true));
    }
  }
  
  // Process tbody
  const tbody = element.querySelector('tbody') || element;
  const bodyRows = tbody.querySelectorAll('tr');
  const bodyRowsArray = Array.isArray(bodyRows) ? bodyRows : Array.from(bodyRows);
  
  for (const row of bodyRowsArray) {
    // Skip if row is inside thead
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (thead && thead.contains && thead.contains(row as any)) {
      continue;
    }
    rows.push(extractRowData(row as ElementLike, false));
  }
  
  return rows;
}

/**
 * Extract data from a table row
 */
function extractRowData(row: ElementLike, isHeader: boolean): TableCell[] {
  const cells: TableCell[] = [];
  const cellElements = row.querySelectorAll('td, th');
  const cellElementsArray = Array.isArray(cellElements) ? cellElements : Array.from(cellElements);
  
  for (const cell of cellElementsArray) {
    const cellElement = cell as ElementLike;
    const text = extractCellText(cellElement);
    cells.push({
      text,
      isHeader: isHeader || cellElement.tagName.toLowerCase() === 'th',
    });
  }
  
  return cells;
}

/**
 * Extract text from table cell
 */
function extractCellText(cell: ElementLike): string {
  // Simple text extraction, removing all formatting
  return cell.textContent?.trim() || '';
}

/**
 * Convert complex table to a structured list
 */
function convertTableToList(rows: TableCell[][], builder: MarkdownBuilder): void {
  if (rows.length === 0) return;
  
  builder.addBlankLine();
  
  // Get headers if available
  const firstRow = rows[0];
  const headers = firstRow && firstRow.every(cell => cell.isHeader) ? firstRow : null;
  const dataStartIndex = headers ? 1 : 0;
  
  // Convert each row to a list item
  for (let i = dataStartIndex; i < rows.length; i++) {
    const row = rows[i];
    builder.addListItem(`Row ${i - dataStartIndex + 1}:`);
    builder.indent(2);
    
    const rowLength = row?.length || 0;
    for (let j = 0; j < rowLength; j++) {
      const cell = row?.[j];
      if (!cell || !cell.text) continue;
      
      const header = headers?.[j];
      const label = header?.text || `Column ${j + 1}`;
      builder.addListItem(`${label}: ${cell.text}`);
    }
    
    builder.outdent(2);
  }
  
  builder.addBlankLine();
}

/**
 * Escape special characters in table cells
 */
function escapeTableCell(text: string): string {
  // Escape pipe characters and remove newlines
  return text
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ')
    .trim();
}

interface TableCell {
  text: string;
  isHeader: boolean;
}