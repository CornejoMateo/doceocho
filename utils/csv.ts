/**
 * CSV building. Delimiter is ';' by default (what Excel es-AR expects, since ',' is the
 * decimal separator there) and the output starts with a UTF-8 BOM so accents open correctly.
 */

export const CSV_BOM = '﻿';
export const CSV_DELIMITER = ';';

export type CsvCell = string | number | null | undefined;

/**
 * Numbers use a comma decimal (12,5) and no thousands separator when the delimiter is ';'
 * (es-AR Excel reads '12.5' as text or a date). With any other delimiter they keep the dot.
 */
export function formatCsvNumber(value: number, delimiter: string = CSV_DELIMITER): string {
	if (!Number.isFinite(value)) return '';
	const text = String(Number(value.toFixed(6)));
	return delimiter === ';' ? text.replace('.', ',') : text;
}

/** Text a spreadsheet could run as a formula. Only fully numeric negatives ('-5', '-5,5') are exempt. */
function needsFormulaGuard(text: string): boolean {
	if (!/^[=+\-@\t\r]/.test(text)) return false;
	return !/^-\d+([.,]\d+)?$/.test(text);
}

/**
 * Escapes one cell: quotes it when it holds the delimiter, quotes or line breaks (doubling
 * inner quotes), and prefixes an apostrophe to text a spreadsheet would run as a formula.
 */
export function escapeCsvCell(value: CsvCell, delimiter: string = CSV_DELIMITER): string {
	if (value === null || value === undefined) return '';
	let text = typeof value === 'number' ? formatCsvNumber(value, delimiter) : value;
	if (typeof value === 'string' && needsFormulaGuard(text)) text = `'${text}`;
	const needsQuotes = text.includes(delimiter) || /["\r\n]/.test(text);
	return needsQuotes ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(
	headers: string[],
	rows: CsvCell[][],
	options: { delimiter?: string; bom?: boolean } = {}
): string {
	const delimiter = options.delimiter ?? CSV_DELIMITER;
	const lines = [headers, ...rows].map((r) =>
		r.map((c) => escapeCsvCell(c, delimiter)).join(delimiter)
	);
	return `${options.bom === false ? '' : CSV_BOM}${lines.join('\r\n')}\r\n`;
}
