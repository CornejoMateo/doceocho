import jsPDF from 'jspdf';
import autoTable, { type UserOptions } from 'jspdf-autotable';
import { sanitizePdfText } from './sanitize';
import { exportFilename } from '@/utils/export-filename';
import { formatDateOnly, getLocalDate } from '@/utils/format-date';
import {
	PDF_ALT_ROW_COLOR,
	PDF_BRAND_COLOR,
	footerOffset,
	headAlignOf,
	printableWidth,
	resolveMargin,
	columnStylesOf,
	filtersLine,
	fitImage,
	footerText,
	needsNewPage,
	capLines,
	limitFilters,
	tableFontSize,
} from './layout';
import type { PdfDocument, PdfResult, PdfSection } from './types';

const tableStyles: Pick<UserOptions, 'headStyles' | 'alternateRowStyles'> = {
	headStyles: { fillColor: PDF_BRAND_COLOR, textColor: [255, 255, 255], fontStyle: 'bold' },
	alternateRowStyles: { fillColor: PDF_ALT_ROW_COLOR },
};

const HEADING_H = 8;
const MAX_IMAGE_W = 170;
const MAX_IMAGE_H = 110;

/**
 * Renders a declarative PdfDocument and downloads it. An image that fails to load is skipped
 * with a note in the document and reported in `skipped`; it never aborts the export.
 * Browser-only (jsPDF triggers a download).
 */
export async function generatePdf(spec: PdfDocument): Promise<PdfResult> {
	const doc = new jsPDF({
		unit: 'mm',
		format: 'a4',
		orientation: spec.orientation,
		compress: true,
	});
	const skipped: string[] = [];
	const pageW = () => doc.internal.pageSize.getWidth();
	const pageH = () => doc.internal.pageSize.getHeight();
	const M = resolveMargin(spec.margin);
	const contentW = () => printableWidth(pageW(), M);
	const compact = spec.compact === true;
	const t = sanitizePdfText;
	let y = M.top;

	const finalY = (): number => {
		const last = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable;
		if (typeof last?.finalY !== 'number') throw new Error('autoTable no dejó posición final');
		return last.finalY;
	};
	const ensure = (h: number) => {
		if (needsNewPage(y, h, pageH(), M.bottom)) {
			doc.addPage();
			y = M.top;
		}
	};
	const heading = (text: string, reserve = 8) => {
		ensure(HEADING_H + reserve);
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(12);
		doc.setTextColor(30);
		doc.text(t(text), M.left, y);
		doc.setFont('helvetica', 'normal');
		y += 6;
	};
	const paragraph = (text: string, italic = true, reserve = 0) => {
		const lines = doc.splitTextToSize(t(text), contentW()) as string[];
		ensure(lines.length * 4.5 + 2 + reserve);
		doc.setFont('helvetica', italic ? 'italic' : 'normal');
		doc.setFontSize(9);
		doc.setTextColor(110);
		doc.text(lines, M.left, y);
		doc.setFont('helvetica', 'normal');
		y += lines.length * 4.5 + 2;
	};
	const table = (
		head: string[],
		body: (string | number)[][],
		fontSize: number,
		extra: Partial<UserOptions> = {}
	) => {
		autoTable(doc, {
			head: [head.map(t)],
			body: body.map((r) => r.map((c) => t(String(c)))),
			startY: y,
			styles: {
				fontSize,
				cellPadding: compact ? 1.5 : 2.5,
				valign: 'middle',
				overflow: 'linebreak',
			},
			tableWidth: 'auto',
			...tableStyles,
			margin: { top: M.top, right: M.right, bottom: M.bottom, left: M.left },
			...extra,
		});
		y = finalY() + 6;
	};

	// Header: title + date, filters (wrapped, capped), summary line. Each line checks for space.
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(18);
	doc.setTextColor(30);
	doc.text(t(spec.title), M.left, y);
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10);
	doc.setTextColor(100);
	doc.text(t(`Fecha: ${formatDateOnly(getLocalDate())}`), pageW() - M.right, y, { align: 'right' });
	y += compact ? 6 : 8;
	const filters = filtersLine(
		spec.filtersDescription === undefined ? undefined : limitFilters(spec.filtersDescription)
	);
	if (filters) {
		const lines = capLines(doc.splitTextToSize(t(filters), contentW()) as string[]);
		for (const line of lines) {
			ensure(4.5);
			doc.text(line, M.left, y);
			y += 4.5;
		}
	}
	if (spec.subtitle) {
		ensure(4.5);
		doc.text(t(spec.subtitle), M.left, y);
		y += 4.5;
	}
	y += compact ? 3 : 6;

	const drawSection = async (s: PdfSection) => {
		switch (s.type) {
			case 'heading':
				heading(s.text, s.reserve);
				break;
			case 'paragraph':
				paragraph(s.text, s.italic ?? true, s.reserve ?? 0);
				break;
			case 'kpis': {
				const withDetail = s.items.some((i) => i.detail);
				table(
					withDetail ? ['Indicador', 'Valor', 'Detalle'] : ['Indicador', 'Valor'],
					s.items.map((i) =>
						withDetail ? [i.label, i.value, i.detail ?? ''] : [i.label, i.value]
					),
					9
				);
				break;
			}
			case 'table':
				if (s.rows.length === 0 && s.emptyText) paragraph(s.emptyText);
				else
					table(
						s.columns.map((c) => c.header),
						s.rows,
						s.fontSize ?? tableFontSize(s.columns.length),
						{
							columnStyles: columnStylesOf(s.columns, contentW()),
							// columnStyles never reach the head in autoTable: align headers like their column.
							didParseCell: (data) => {
								if (data.section === 'head')
									data.cell.styles.halign = headAlignOf(s.columns, data.column.index);
							},
						}
					);
				break;
			case 'image': {
				let headingDrawn = false;
				try {
					const img = await s.load();
					if (!img || !(img.width > 0) || !(img.height > 0)) {
						heading(s.title);
						paragraph(s.emptyText ?? 'Sin datos para mostrar.');
						break;
					}
					const wMm = Math.min(contentW(), MAX_IMAGE_W);
					const box = fitImage(wMm, (wMm * img.height) / img.width, contentW(), MAX_IMAGE_H);
					heading(s.title, box.height + 4);
					headingDrawn = true;
					doc.addImage(img.dataUrl, 'PNG', M.left, y, box.width, box.height);
					y += box.height + 4;
				} catch {
					skipped.push(s.title);
					if (!headingDrawn) heading(s.title);
					paragraph(s.failText ?? 'No se pudo incluir este gráfico en el PDF.');
				}
				break;
			}
			case 'pageBreak':
				doc.addPage('a4', s.orientation ?? spec.orientation);
				y = M.top;
				break;
		}
	};
	for (const section of spec.sections) await drawSection(section);

	const pages = doc.getNumberOfPages();
	for (let i = 1; i <= pages; i++) {
		doc.setPage(i);
		doc.setFontSize(8);
		doc.setTextColor(150);
		doc.text(t(footerText(i, pages)), M.left, pageH() - footerOffset(M.bottom));
	}

	const filename = exportFilename(spec.filenameBase, 'pdf');
	doc.save(filename);
	return { filename, skipped };
}
