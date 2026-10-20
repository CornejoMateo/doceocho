import jsPDF from 'jspdf';
import type { ClientBudget } from '@/helpers/budget-builder/share';
import { projectView, type DrawingView } from '@/helpers/budget-builder/drawings';
import { finishLabel } from '@/helpers/budget-builder/calculate';
import { formatCurrency } from '@/utils/formats-money';

// A4 portrait, in mm. Architectural sheet: thin lines, one typeface, lots of air.
const PAGE = { width: 210, height: 297, margin: 18 };
const INK = 30;
const MUTED = 120;
const RULE = 200;
const HIDDEN = 175;
/** Room each view needs for its label, even when the piece is very narrow. */
const MIN_VIEW_WIDTH = 16;
const DRAWING_HEIGHT = 46;
const ITEM_HEIGHT = 70;

const VIEWS: { view: DrawingView; label: string }[] = [
	{ view: 'frente', label: 'FRENTE' },
	{ view: 'lateral', label: 'LATERAL' },
	{ view: 'planta', label: 'PLANTA' },
];

const formatDate = (iso: string) =>
	new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function label(doc: jsPDF, text: string, x: number, y: number, align: 'left' | 'right' = 'left') {
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(7);
	doc.setTextColor(MUTED);
	doc.setCharSpace(0.6);
	doc.text(text.toUpperCase(), x, y, { align });
	doc.setCharSpace(0);
}

function rule(doc: jsPDF, y: number) {
	doc.setDrawColor(RULE);
	doc.setLineWidth(0.2);
	doc.line(PAGE.margin, y, PAGE.width - PAGE.margin, y);
}

/** Overall dimension line with ticks, the way it is drawn on a plan. */
function dimension(doc: jsPDF, x1: number, y1: number, x2: number, y2: number, text: string) {
	const vertical = x1 === x2;
	doc.setDrawColor(MUTED);
	doc.setLineWidth(0.15);
	doc.line(x1, y1, x2, y2);
	const tick = 1.2;
	if (vertical) {
		doc.line(x1 - tick, y1, x1 + tick, y1);
		doc.line(x2 - tick, y2, x2 + tick, y2);
	} else {
		doc.line(x1, y1 - tick, x1, y1 + tick);
		doc.line(x2, y2 - tick, x2, y2 + tick);
	}
	doc.setFontSize(6.5);
	doc.setTextColor(MUTED);
	if (vertical) {
		doc.text(text, x1 - 1.8, (y1 + y2) / 2, { angle: 90, align: 'center' });
	} else {
		doc.text(text, (x1 + x2) / 2, y1 + 3.2, { align: 'center' });
	}
}

/** The three views share one scale, so proportions between them are true. */
function drawViews(
	doc: jsPDF,
	item: ClientBudget['items'][number],
	x: number,
	y: number,
	width: number
) {
	const drawings = VIEWS.map(({ view, label: name }) => ({
		name,
		drawing: projectView(item.shape, item.dimensions, view),
	}));

	const gap = 10;
	const totalWidth = drawings.reduce((sum, { drawing }) => sum + drawing.width, 0);
	const tallest = Math.max(...drawings.map(({ drawing }) => drawing.height));
	const heightScale = (DRAWING_HEIGHT - 8) / tallest;

	// Narrow views (the side of a bookcase) still need room for their label.
	const firstScale = Math.min((width - gap * 2) / totalWidth, heightScale);
	const padding = drawings.reduce(
		(sum, { drawing }) => sum + Math.max(0, MIN_VIEW_WIDTH - drawing.width * firstScale),
		0
	);
	const scale = Math.min((width - gap * 2 - padding) / totalWidth, heightScale);

	let cursor = x;
	for (const { name, drawing } of drawings) {
		const top = y + (DRAWING_HEIGHT - 8 - drawing.height * scale);

		doc.setLineWidth(0.25);
		for (const rect of drawing.rects) {
			if (rect.hidden) {
				doc.setDrawColor(HIDDEN);
				doc.setLineDashPattern([0.8, 0.8], 0);
			} else {
				doc.setDrawColor(INK);
				doc.setLineDashPattern([], 0);
			}
			const filled = rect.kind === 'back' && !rect.hidden;
			if (filled) doc.setFillColor(238, 236, 232);
			doc.rect(
				cursor + rect.x * scale,
				top + rect.y * scale,
				Math.max(rect.w * scale, 0.2),
				Math.max(rect.h * scale, 0.2),
				filled ? 'FD' : 'S'
			);
		}
		doc.setLineDashPattern([], 0);

		const right = cursor + drawing.width * scale;
		const bottom = top + drawing.height * scale;
		dimension(doc, cursor, bottom + 2.5, right, bottom + 2.5, `${round(drawing.width)}`);
		if (name === 'FRENTE') {
			dimension(doc, cursor - 3, top, cursor - 3, bottom, `${round(drawing.height)}`);
		}
		label(doc, name, cursor, y + DRAWING_HEIGHT + 2);

		cursor += Math.max(right - cursor, MIN_VIEW_WIDTH) + gap;
	}
}

const round = (value: number) => Math.round(value * 10) / 10;

function header(doc: jsPDF, data: ClientBudget): number {
	const { margin } = PAGE;
	let y = margin + 4;

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(13);
	doc.setTextColor(INK);
	doc.text(data.company.name || 'Presupuesto', margin, y);

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8);
	doc.setTextColor(MUTED);
	const contact = [data.company.address, data.company.phone, data.company.email]
		.filter(Boolean)
		.join('  ·  ');
	if (contact) doc.text(contact, margin, y + 5);

	label(doc, 'Presupuesto', PAGE.width - margin, y - 4, 'right');
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(13);
	doc.setTextColor(INK);
	doc.text(data.code, PAGE.width - margin, y + 1, { align: 'right' });
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8);
	doc.setTextColor(MUTED);
	doc.text(formatDate(data.createdAt), PAGE.width - margin, y + 5.5, { align: 'right' });

	y += 12;
	rule(doc, y);
	y += 8;

	if (data.clientName) {
		label(doc, 'Cliente', margin, y);
		doc.setFontSize(10);
		doc.setTextColor(INK);
		doc.text(data.clientName, margin, y + 5);
		y += 12;
	}

	return y;
}

function footer(doc: jsPDF, page: number, pages: number) {
	const y = PAGE.height - 10;
	doc.setFontSize(7);
	doc.setTextColor(MUTED);
	doc.text(`${page} / ${pages}`, PAGE.width - PAGE.margin, y, { align: 'right' });
}

export function buildBudgetPdf(data: ClientBudget): jsPDF {
	const doc = new jsPDF({ unit: 'mm', format: 'a4' });
	const { margin } = PAGE;
	const contentWidth = PAGE.width - margin * 2;
	const textX = margin + contentWidth * 0.62;

	let y = header(doc, data);

	data.items.forEach((item, index) => {
		if (y + ITEM_HEIGHT > PAGE.height - margin - 20) {
			doc.addPage();
			y = margin + 6;
		}

		label(doc, String(index + 1).padStart(2, '0'), margin, y);
		drawViews(doc, item, margin + 4, y + 2, contentWidth * 0.58);

		doc.setFont('helvetica', 'bold');
		doc.setFontSize(10.5);
		doc.setTextColor(INK);
		doc.text(item.name, textX, y + 4);

		doc.setFont('helvetica', 'normal');
		doc.setFontSize(8);
		doc.setTextColor(MUTED);
		const { width, depth, height } = item.dimensions;
		const details = [
			`${width} × ${depth} × ${height} cm (ancho × prof. × alto)`,
			finishLabel(item),
			item.units > 1 ? `${item.units} unidades` : '',
		].filter(Boolean);
		details.forEach((line, i) => doc.text(line, textX, y + 10 + i * 4.5));

		let notesY = y + 10 + details.length * 4.5 + 2;
		if (item.notes) {
			const notes = doc.splitTextToSize(item.notes, contentWidth * 0.38);
			doc.text(notes.slice(0, 4), textX, notesY);
			notesY += Math.min(notes.length, 4) * 4;
		}

		doc.setFont('helvetica', 'bold');
		doc.setFontSize(10);
		doc.setTextColor(INK);
		doc.text(formatCurrency(item.price), PAGE.width - margin, y + DRAWING_HEIGHT, {
			align: 'right',
		});

		y += ITEM_HEIGHT - 8;
		rule(doc, y);
		y += 8;
	});

	if (y + 45 > PAGE.height - margin) {
		doc.addPage();
		y = margin + 6;
	}

	label(doc, 'Total', PAGE.width - margin, y, 'right');
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(16);
	doc.setTextColor(INK);
	doc.text(formatCurrency(data.total), PAGE.width - margin, y + 8, { align: 'right' });

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8);
	doc.setTextColor(MUTED);
	doc.text(`Validez: ${data.validityDays} días desde la fecha de emisión.`, margin, y + 2);
	if (data.notes) {
		doc.text(doc.splitTextToSize(data.notes, contentWidth * 0.6), margin, y + 7);
	}

	const signY = Math.min(y + 34, PAGE.height - margin - 6);
	doc.setDrawColor(RULE);
	doc.line(margin, signY, margin + 60, signY);
	label(doc, 'Aceptación del cliente', margin, signY + 4);

	const pages = doc.getNumberOfPages();
	for (let page = 1; page <= pages; page++) {
		doc.setPage(page);
		footer(doc, page, pages);
	}

	return doc;
}

export function downloadBudgetPdf(data: ClientBudget) {
	buildBudgetPdf(data).save(`${data.code}${data.clientName ? ` - ${data.clientName}` : ''}.pdf`);
}
