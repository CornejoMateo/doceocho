import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BudgetReportRow } from '@/components/business/reports/budgets/types';
import { formatCurrency, formatCurrencyUSD } from '@/utils/formats-money';
import { BUDGETS_REPORT_COLUMNS } from '@/constants/budgets/budgets-report';

/**
 * Generates a PDF report of filtered budgets
 * @param rows - The filtered budget rows to include in the PDF
 * @param filtersDescription - Optional description of active filters
 */
export function generateBudgetsPDF(rows: BudgetReportRow[], filtersDescription?: string): void {
	const doc = new jsPDF();

	// Title
	doc.setFontSize(18);
	doc.text('Reporte de Presupuestos', 14, 20);

	// Subtitle with filter info
	doc.setFontSize(10);
	doc.setTextColor(100);
	if (filtersDescription) {
		doc.text(`Filtros aplicados: ${filtersDescription}`, 14, 28);
	} else {
		doc.text('Sin filtros aplicados', 14, 28);
	}

	// Date
	const currentDate = new Date();
	const dateStr = currentDate.toLocaleDateString('es-AR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	});
	doc.text(`Fecha: ${dateStr}`, 14, 35);

	// Table headers
	const headers = [
		BUDGETS_REPORT_COLUMNS.date,
		BUDGETS_REPORT_COLUMNS.client,
		BUDGETS_REPORT_COLUMNS.number,
		BUDGETS_REPORT_COLUMNS.type,
		BUDGETS_REPORT_COLUMNS.work,
		BUDGETS_REPORT_COLUMNS.amountArs,
		BUDGETS_REPORT_COLUMNS.amountUsd,
		BUDGETS_REPORT_COLUMNS.status,
	];

	// Table data
	const data = rows.map((row) => [
		row.date,
		row.client,
		row.number,
		row.type,
		row.work,
		formatCurrency(row.amountArs),
		formatCurrencyUSD(row.amountUsd),
		row.status,
	]);

	// Generate table
	autoTable(doc, {
		head: [headers],
		body: data,
		startY: 45,
		styles: {
			fontSize: 8,
			cellPadding: 3,
		},
		headStyles: {
			fillColor: [79, 92, 77], // DOCE OCHO brand color
			textColor: [255, 255, 255],
			fontStyle: 'bold',
		},
		alternateRowStyles: {
			fillColor: [245, 245, 245],
		},
		margin: { top: 10, right: 10, bottom: 10, left: 10 },
	});

	// Footer with total count
	const pageCount = doc.internal.pages.length - 1; // pages includes page 0 (config page)
	for (let i = 1; i <= pageCount; i++) {
		doc.setPage(i);
		doc.setFontSize(8);
		doc.setTextColor(150);
		doc.text(
			`Total de presupuestos: ${rows.length} - Página ${i} de ${pageCount}`,
			14,
			doc.internal.pageSize.height - 10
		);
	}

	// Save the PDF
	const date = new Date();
	const day = String(date.getDate()).padStart(2, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const year = date.getFullYear();
	const timestamp = `${day}-${month}-${year}`;
	doc.save(`presupuestos_${timestamp}.pdf`);
}

/**
 * Creates a human-readable description of active filters
 */
export function getFiltersDescription(filters: {
	status: string;
	minAmountArs: string;
	maxAmountArs: string;
	minAmountUsd: string;
	maxAmountUsd: string;
}): string {
	const parts: string[] = [];

	if (filters.status !== 'all') {
		parts.push(`Estado: ${filters.status}`);
	}
	if (filters.minAmountArs) {
		parts.push(`ARS mínimo: ${filters.minAmountArs}`);
	}
	if (filters.maxAmountArs) {
		parts.push(`ARS máximo: ${filters.maxAmountArs}`);
	}
	if (filters.minAmountUsd) {
		parts.push(`USD mínimo: ${filters.minAmountUsd}`);
	}
	if (filters.maxAmountUsd) {
		parts.push(`USD máximo: ${filters.maxAmountUsd}`);
	}

	return parts.length > 0 ? parts.join(', ') : 'Todos';
}
