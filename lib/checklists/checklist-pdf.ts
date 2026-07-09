import jsPDF from 'jspdf';
import { Checklist, ChecklistItem } from './checklists';

export async function generateChecklistPDF(
	checklists: Checklist[],
	clientName?: string,
	workLocality?: string,
	workAddress?: string,
	itemsByChecklist?: Record<number, ChecklistItem[]>
): Promise<void> {
	const getItems = (cl: Checklist): ChecklistItem[] =>
		(itemsByChecklist && itemsByChecklist[cl.id]) || [];

	const pdf = new jsPDF('p', 'mm', 'a4');
	const pageWidth = pdf.internal.pageSize.getWidth();
	const pageHeight = pdf.internal.pageSize.getHeight();
	const margin = 10;
	const gutter = 6;
	const footerReserve = 14;
	const columnWidth = (pageWidth - 2 * margin - gutter) / 2;
	let yPosition = margin;

	const estimateChecklistHeight = (checklist: Checklist) => {
		const minRowHeight = 7;
		const lineHeight = 3.5;
		const cellPadding = 2;
		const tableWidth = columnWidth;
		const col1Width = tableWidth * 0.52;
		const col2Width = tableWidth * 0.24;
		const col3Width = tableWidth - col1Width - col2Width;
		const items = getItems(checklist);

		pdf.setFontSize(9);
		const headerLines1 = pdf.splitTextToSize(
			`${checklist.name || ''}`,
			col1Width - 2 * cellPadding
		);
		const headerLines2 = pdf.splitTextToSize(
			checklist.description || 'Sin descripción',
			col2Width - 2 * cellPadding
		);
		const estimateDims =
			[
				checklist.width != null ? `${checklist.width}` : '',
				checklist.height != null ? `${checklist.height}` : '',
				checklist.depth || '',
			]
				.filter(Boolean)
				.join(' x ') || '-';

		const headerLines3 = pdf.splitTextToSize(estimateDims, col3Width - 2 * cellPadding);

		const headerHeight = Math.max(
			minRowHeight,
			headerLines1.length * lineHeight + 4,
			headerLines2.length * lineHeight + 4,
			headerLines3.length * lineHeight + 4
		);

		let tableRowsHeight = 0;
		pdf.setFontSize(8.5);

		items.forEach((item: ChecklistItem) => {
			const lines = pdf.splitTextToSize(item.description, col1Width - 2 * cellPadding);
			const textHeight = lines.length * lineHeight;
			const itemHeight = Math.max(minRowHeight, textHeight + 4);
			tableRowsHeight += itemHeight;
		});

		let observationsHeight = 10;
		if (checklist.notes && checklist.notes.trim()) {
			pdf.setFontSize(9);
			const obsTextWidth = pdf.getTextWidth('OBSERVACIONES:');
			pdf.setFontSize(8.5);
			const notesLines = pdf.splitTextToSize(
				checklist.notes,
				tableWidth - obsTextWidth - cellPadding - 3
			);
			observationsHeight += notesLines.length * 3.5;
		}
		observationsHeight += 8;

		return headerHeight + tableRowsHeight + observationsHeight;
	};

	const renderChecklistAt = (
		checklist: Checklist,
		checklistIndex: number,
		xLeft: number,
		yTop: number,
		width: number
	) => {
		const items = getItems(checklist);
		const tableLeft = xLeft;
		const tableWidth = width;
		const cellPadding = 2;
		const minRowHeight = 7;
		const lineHeight = 3.5;

		const col1Width = tableWidth * 0.52;
		const col2Width = tableWidth * 0.24;
		const col3Width = tableWidth - col1Width - col2Width;

		pdf.setFontSize(9);
		pdf.setFont('helvetica', 'bold');

		const headerText1 = pdf.splitTextToSize(
			checklist.name || `PV${checklistIndex + 1}`,
			col1Width - 2 * cellPadding
		);

		const headerText2 = pdf.splitTextToSize(
			checklist.description || 'Sin descripción',
			col2Width - 2 * cellPadding
		);

		const dims =
			[
				checklist.width != null ? `${checklist.width}` : '',
				checklist.height != null ? `${checklist.height}` : '',
				checklist.depth || '',
			]
				.filter(Boolean)
				.join(' x ') || '-';

		const headerText3 = pdf.splitTextToSize(dims, col3Width - 2 * cellPadding);

		const headerHeight = Math.max(
			minRowHeight,
			headerText1.length * lineHeight + 4,
			headerText2.length * lineHeight + 4,
			headerText3.length * lineHeight + 4
		);

		pdf.setFillColor(255, 255, 255);
		pdf.setDrawColor(0, 0, 0);
		pdf.setLineWidth(0.5);
		pdf.setTextColor(0, 0, 0);
		pdf.setFont('helvetica', 'bold');

		pdf.rect(tableLeft, yTop, col1Width, headerHeight, 'FD');
		pdf.rect(tableLeft + col1Width, yTop, col2Width, headerHeight, 'FD');
		pdf.rect(tableLeft + col1Width + col2Width, yTop, col3Width, headerHeight, 'FD');

		headerText1.forEach((line: string, i: number) => {
			pdf.text(line, tableLeft + cellPadding, yTop + cellPadding + 3 + i * lineHeight);
		});

		headerText2.forEach((line: string, i: number) => {
			pdf.text(line, tableLeft + col1Width + cellPadding, yTop + cellPadding + 3 + i * lineHeight);
		});

		headerText3.forEach((line: string, i: number) => {
			pdf.text(
				line,
				tableLeft + col1Width + col2Width + cellPadding,
				yTop + cellPadding + 3 + i * lineHeight
			);
		});

		pdf.setLineWidth(0.1);
		pdf.setTextColor(0, 0, 0);
		pdf.setFont('helvetica', 'normal');
		pdf.setFontSize(8.5);

		let currentY = yTop + headerHeight;

		items.forEach((item: ChecklistItem) => {
			const itemText = pdf.splitTextToSize(item.description, col1Width - 2 * cellPadding);

			const itemHeight = Math.max(minRowHeight, itemText.length * lineHeight + 4);

			pdf.rect(tableLeft, currentY, col1Width, itemHeight);
			pdf.rect(tableLeft + col1Width, currentY, col2Width, itemHeight);
			pdf.rect(tableLeft + col1Width + col2Width, currentY, col3Width, itemHeight);

			itemText.forEach((line: string, idx: number) => {
				pdf.text(line, tableLeft + cellPadding, currentY + cellPadding + 3 + idx * lineHeight);
			});

			// Done checkmark
			if (item.done) {
				pdf.setFontSize(9);
				pdf.text('OK', tableLeft + col1Width + 2, currentY + itemHeight / 2 + 1);
			}

			currentY += itemHeight;
		});

		const obsY = currentY + 8;
		pdf.setFontSize(9);
		pdf.setFont('helvetica', 'bold');
		pdf.setTextColor(0, 0, 0);
		pdf.text('OBSERVACIONES:', tableLeft, obsY);

		let finalY = obsY;

		if (checklist.notes && checklist.notes.trim()) {
			const obsTextWidth = pdf.getTextWidth('OBSERVACIONES:');
			pdf.setFontSize(8.5);
			pdf.setFont('helvetica', 'normal');
			const notesLines = pdf.splitTextToSize(
				checklist.notes,
				tableWidth - obsTextWidth - cellPadding - 3
			);

			if (notesLines.length > 0) {
				pdf.text(notesLines[0], tableLeft + obsTextWidth + 3, obsY);
			}

			for (let idx = 1; idx < notesLines.length; idx++) {
				pdf.text(notesLines[idx], tableLeft, obsY + idx * 3.5);
			}

			finalY += notesLines.length * 3.5;
		}

		finalY += 8;

		return finalY - yTop;
	};

	pdf.setFontSize(16);
	pdf.setFont('helvetica', 'bold');
	yPosition += 8;

	if (clientName) {
		pdf.setFontSize(11);

		// Client
		pdf.setFont('helvetica', 'bold');
		pdf.setTextColor(0, 0, 0);
		pdf.text('Cliente:', margin, yPosition);

		pdf.setFont('helvetica', 'normal');
		pdf.setTextColor(0, 0, 0);
		pdf.text(clientName, margin + 18, yPosition);

		// work
		if (workLocality && workAddress) {
			const clientTextWidth = pdf.getTextWidth(clientName);
			const obraStartX = margin + 18 + clientTextWidth + 15;

			pdf.setFont('helvetica', 'bold');
			pdf.setTextColor(0, 0, 0);
			pdf.text('Obra:', obraStartX, yPosition);

			pdf.setFont('helvetica', 'normal');
			pdf.setTextColor(0, 0, 0);
			pdf.text(`${workAddress}, ${workLocality}`, obraStartX + 13, yPosition);
		}

		yPosition += 8;
	}

	// separator line
	pdf.setDrawColor(200, 200, 200);
	pdf.setLineWidth(0.5);
	pdf.line(margin, yPosition, pageWidth - margin, yPosition);
	yPosition += 8;

	for (let i = 0; i < checklists.length; i += 2) {
		const left = checklists[i];
		const right = i + 1 < checklists.length ? checklists[i + 1] : undefined;

		const leftHeight = estimateChecklistHeight(left);
		const rightHeight = right ? estimateChecklistHeight(right) : 0;

		const blockHeight = Math.max(leftHeight, rightHeight);

		if (yPosition + blockHeight > pageHeight - margin - footerReserve) {
			pdf.addPage();
			yPosition = margin;
		}

		const leftX = margin;
		const rightX = margin + columnWidth + gutter;

		renderChecklistAt(left, i, leftX, yPosition, columnWidth);

		if (right) {
			renderChecklistAt(right, i + 1, rightX, yPosition, columnWidth);
		}

		yPosition += blockHeight + 6;
	}

	// Footer
	const totalPages = pdf.internal.pages.length - 1;

	for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
		pdf.setPage(pageNum);
		pdf.setFontSize(8);
		pdf.setFont('helvetica', 'italic');
		pdf.setTextColor(150);
		pdf.text(`Página ${pageNum} de ${totalPages}`, pageWidth / 2, pageHeight - 10, {
			align: 'center',
		});
		pdf.setTextColor(0);
	}

	const fileName = `checklists_obra_${new Date().toISOString().split('T')[0]}.pdf`;
	pdf.save(fileName);
}
