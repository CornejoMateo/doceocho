import { defaultOrientation, pdfColumnsOf } from '@/helpers/pdf/layout';
import type { PdfDocument, PdfOrientation } from '@/helpers/pdf/types';
import type { WorkWithProgress } from '@/lib/works/works';
import { buildCsv } from '@/utils/csv';
import { buildTableFromColumns, selectColumns } from '@/utils/export-columns';
import { tableFontSize } from '@/helpers/pdf/layout';
import { WORK_COLUMNS } from './works-columns';

/* Pure builders for the works-list export. Order of `works` is preserved (on-screen order). */

/** mm: 8 on the sides, 12 top and bottom. */
export const WORKS_PDF_MARGIN = { top: 12, right: 8, bottom: 12, left: 8 };

export type OrientationChoice = 'auto' | PdfOrientation;

export function resolveOrientation(choice: OrientationChoice, columnCount: number): PdfOrientation {
	return choice === 'auto' ? defaultOrientation(columnCount) : choice;
}

export function buildWorksCsv(works: WorkWithProgress[], keys: readonly string[]): string {
	const t = buildTableFromColumns(works, selectColumns(WORK_COLUMNS, keys), 'csv');
	return buildCsv(t.headers, t.rows);
}

export function buildWorksPdfDocument(
	works: WorkWithProgress[],
	keys: readonly string[],
	opts: { orientation: OrientationChoice; filtersDescription: string[]; totalWorks: number }
): PdfDocument {
	const columns = selectColumns(WORK_COLUMNS, keys);
	const t = buildTableFromColumns(works, columns, 'pdf');
	return {
		title: 'Listado de obras',
		subtitle: `Obras incluidas: ${works.length} de ${opts.totalWorks}`,
		filtersDescription: opts.filtersDescription,
		orientation: resolveOrientation(opts.orientation, columns.length),
		filenameBase: 'obras',
		// Compact page: uses the width a wide table needs; footer stays readable.
		margin: WORKS_PDF_MARGIN,
		compact: true,
		sections: [
			{
				type: 'table',
				columns: pdfColumnsOf(t),
				rows: t.rows,
				fontSize: tableFontSize(columns.length),
				emptyText: 'Ninguna obra coincide con los filtros.',
			},
		],
	};
}
