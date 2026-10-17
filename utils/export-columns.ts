/**
 * Generic column model so any entity defines its export columns once and gets both formats.
 * `accessor` receives the mode because PDF wants display text ('40%', '12,5 d') while CSV
 * wants raw numbers.
 */

export type ExportMode = 'pdf' | 'csv';
export type ExportCell = string | number | null | undefined;

export interface ExportColumn<T> {
	key: string;
	label: string;
	/** Header used in CSV when it differs from `label` (e.g. 'Avance (%)'). */
	csvLabel?: string;
	align?: 'left' | 'right' | 'center';
	/** Preferred PDF width in mm; omit for automatic. */
	width?: number;
	/** Relative PDF width; columns with weights split the printable width (long text > short values). */
	weight?: number;
	accessor: (row: T, mode: ExportMode) => ExportCell;
}

export type ExportTable = {
	headers: string[];
	rows: (string | number)[][];
	aligns: ('left' | 'right' | 'center')[];
	widths: (number | undefined)[];
	weights: (number | undefined)[];
};

export function buildTableFromColumns<T>(
	rows: T[],
	columns: ExportColumn<T>[],
	mode: ExportMode
): ExportTable {
	return {
		headers: columns.map((c) => (mode === 'csv' ? (c.csvLabel ?? c.label) : c.label)),
		rows: rows.map((r) => columns.map((c) => c.accessor(r, mode) ?? '')),
		aligns: columns.map((c) => c.align ?? 'left'),
		widths: columns.map((c) => c.width),
		weights: columns.map((c) => c.weight),
	};
}

/** Columns for the given keys, always in the canonical order of `all`; unknown keys are dropped. */
export function selectColumns<T>(
	all: ExportColumn<T>[],
	keys: readonly string[]
): ExportColumn<T>[] {
	const wanted = new Set(keys);
	return all.filter((c) => wanted.has(c.key));
}

/** Reads a persisted key list defensively; falls back to `defaults` when missing or invalid. */
export function parseStoredKeys(
	raw: string | null,
	valid: readonly string[],
	defaults: string[]
): string[] {
	if (!raw) return defaults;
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return defaults;
		const keys = parsed.filter((k): k is string => typeof k === 'string' && valid.includes(k));
		return keys.length > 0 ? keys : defaults;
	} catch {
		return defaults;
	}
}
