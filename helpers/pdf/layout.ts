import type { ExportTable } from '@/utils/export-columns';
import type { PdfColumn, PdfMargin, PdfOrientation } from './types';

/* Pure layout helpers (no jsPDF, no DOM). */

export const PDF_BRAND_COLOR: [number, number, number] = [79, 92, 77];
export const PDF_ALT_ROW_COLOR: [number, number, number] = [245, 245, 245];
export const PDF_MARGIN = 14;
/** Space kept free at the bottom of each page for the footer. */
export const PDF_BOTTOM_RESERVE = 16;
/** Top of the content area; also the top margin of tables on continuation pages. */
export const PDF_TOP = 20;
/** Header limits: keeps a huge filter list from filling the first page. */
export const MAX_FILTER_ITEMS = 8;
export const MAX_FILTER_LINES = 6;

/** Landscape once a table has more than 6 columns. */
export function defaultOrientation(columnCount: number): PdfOrientation {
	return columnCount > 6 ? 'landscape' : 'portrait';
}

/** True when `height` does not fit below `y` on a page of `pageHeight`. */
export function needsNewPage(
	y: number,
	height: number,
	pageHeight: number,
	bottom: number = PDF_BOTTOM_RESERVE
): boolean {
	return y + height > pageHeight - bottom;
}

export type ResolvedMargin = { top: number; right: number; bottom: number; left: number };

export const DEFAULT_PDF_MARGIN: ResolvedMargin = {
	top: PDF_TOP,
	right: PDF_MARGIN,
	bottom: PDF_BOTTOM_RESERVE,
	left: PDF_MARGIN,
};

export function resolveMargin(margin?: PdfMargin): ResolvedMargin {
	if (margin === undefined) return DEFAULT_PDF_MARGIN;
	if (typeof margin === 'number') {
		const m = Math.max(0, margin);
		return { top: m, right: m, bottom: m, left: m };
	}
	return {
		top: Math.max(0, margin.top),
		right: Math.max(0, margin.right),
		bottom: Math.max(0, margin.bottom),
		left: Math.max(0, margin.left),
	};
}

export const printableWidth = (pageWidth: number, m: ResolvedMargin) =>
	Math.max(0, pageWidth - m.left - m.right);

/** Footer baseline distance from the page bottom: 8 mm by default, closer with tight margins. */
export const footerOffset = (bottomMargin: number) => Math.max(4, Math.min(8, bottomMargin / 2));

/**
 * Splits `total` mm across columns by relative weight (missing weights use the average).
 * No column ends up narrower than `minEach` (taken proportionally from the others).
 */
export function columnWidthsFromWeights(
	weights: (number | undefined)[],
	total: number,
	minEach = 0
): number[] {
	const known = weights.filter((w): w is number => typeof w === 'number' && w > 0);
	if (weights.length === 0 || total <= 0) return weights.map(() => 0);
	const avg = known.length ? known.reduce((a, b) => a + b, 0) / known.length : 1;
	const w = weights.map((x) => (typeof x === 'number' && x > 0 ? x : avg));
	let widths = scale(w, total);
	if (minEach > 0 && minEach * w.length <= total) {
		const fixed = widths.map((x) => x < minEach);
		if (fixed.some(Boolean)) {
			const freeTotal = total - fixed.filter(Boolean).length * minEach;
			const freeW = w.map((x, i) => (fixed[i] ? 0 : x));
			const scaled = scale(freeW, freeTotal);
			widths = widths.map((_, i) => (fixed[i] ? minEach : scaled[i]));
		}
	}
	return widths;
}

function scale(weights: number[], total: number): number[] {
	const sum = weights.reduce((a, b) => a + b, 0);
	return weights.map((x) => (sum > 0 ? (x / sum) * total : 0));
}

export const footerText = (page: number, total: number) => `Página ${page} de ${total}`;

export function filtersLine(filters: string[] | undefined): string | null {
	if (filters === undefined) return null;
	return filters.length
		? `Filtros aplicados: ${filters.join(' | ')}`
		: 'Filtros aplicados: ninguno';
}

/** Scales an image to fit inside a box, never enlarging it. */
export function fitImage(
	width: number,
	height: number,
	maxWidth: number,
	maxHeight: number
): { width: number; height: number } {
	if (width <= 0 || height <= 0) return { width: 0, height: 0 };
	const ratio = Math.min(1, maxWidth / width, maxHeight / height);
	return { width: width * ratio, height: height * ratio };
}

/** Narrowest weighted column, in mm (keeps short headers like 'Avance' from breaking mid-word). */
export const MIN_WEIGHTED_COLUMN_MM = 11;

type ColumnStyle = { halign: 'left' | 'right' | 'center'; cellWidth?: number };

/**
 * autoTable columnStyles (index -> style). When `printable` is given and columns carry weights,
 * the columns without a fixed width split what is left of the printable width by weight, so the
 * table spans the whole page.
 */
export function columnStylesOf(
	columns: PdfColumn[],
	printable?: number
): Record<number, ColumnStyle> {
	const weighted = printable !== undefined && columns.some((c) => c.weight && !c.width);
	let widths: number[] = [];
	if (weighted) {
		const fixed = columns.reduce((a, c) => a + (c.width ?? 0), 0);
		const flexIdx = columns.map((c, i) => (c.width ? -1 : i)).filter((i) => i >= 0);
		const flex = columnWidthsFromWeights(
			flexIdx.map((i) => columns[i].weight),
			Math.max(0, (printable as number) - fixed),
			MIN_WEIGHTED_COLUMN_MM
		);
		widths = columns.map((c) => c.width ?? 0);
		flexIdx.forEach((i, k) => (widths[i] = flex[k]));
	}
	const out: Record<number, ColumnStyle> = {};
	columns.forEach((c, i) => {
		const cellWidth = weighted ? widths[i] : c.width;
		out[i] = { halign: c.align ?? 'left', ...(cellWidth ? { cellWidth } : {}) };
	});
	return out;
}

/** Header alignment for a column: autoTable applies columnStyles to body cells only. */
export function headAlignOf(columns: PdfColumn[], index: number): 'left' | 'right' | 'center' {
	return columns[index]?.align ?? 'left';
}

/** Bridges an ExportTable (from buildTableFromColumns) to PDF columns. */
export function pdfColumnsOf(
	table: Pick<ExportTable, 'headers' | 'aligns' | 'widths'> & Partial<Pick<ExportTable, 'weights'>>
): PdfColumn[] {
	return table.headers.map((header, i) => ({
		header,
		align: table.aligns[i],
		width: table.widths[i],
		weight: table.weights?.[i],
	}));
}

/** Font size that keeps wide tables legible: fewer columns, larger text, never below 6.5 pt. */
export function tableFontSize(columnCount: number): number {
	if (columnCount <= 5) return 9;
	if (columnCount <= 8) return 8;
	if (columnCount <= 11) return 7;
	return 6.5;
}

/** Keeps the first `max` filters and summarizes the rest as '… y N filtros más'. */
export function limitFilters(filters: string[], max: number = MAX_FILTER_ITEMS): string[] {
	if (filters.length <= max) return filters;
	const rest = filters.length - max;
	return [...filters.slice(0, max), `… y ${rest} ${rest === 1 ? 'filtro más' : 'filtros más'}`];
}

/** Caps wrapped text lines; the last kept line ends with an ellipsis when something was cut. */
export function capLines(lines: string[], max: number = MAX_FILTER_LINES): string[] {
	if (lines.length <= max) return lines;
	const kept = lines.slice(0, max);
	kept[max - 1] = `${kept[max - 1].replace(/[\s.,;|]+$/, '')}…`;
	return kept;
}
