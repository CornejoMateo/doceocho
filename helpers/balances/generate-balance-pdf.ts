import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BalanceReportRow } from '@/components/business/reports/balances/types';
import { formatCurrency, parseArsToNumber } from '@/utils/formats-money';
import { BALANCES_REPORT_COLUMNS } from '@/constants/balances/balances-report';
import { formatCreatedAt } from '@/utils/format-date';

/**
 * Generates a PDF report of filtered balances
 * @param rows - The filtered balance rows to include in the PDF
 * @param filtersDescription - Optional description of active filters
 */
export function generateBalancesPDF(rows: BalanceReportRow[], filtersDescription?: string): void {
	const doc = new jsPDF();

	// Title
	doc.setFontSize(18);
	doc.text('Reporte de Saldos', 14, 20);

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
	doc.text(`Fecha: ${dateStr}`, 196, 20, { align: 'right' });

	// Calculate table start position based on filters height
	const filterText = filtersDescription || 'Sin filtros aplicados';
	const filterLines = doc.splitTextToSize(`Filtros aplicados: ${filterText}`, 180);
	const tableStartY = 28 + filterLines.length * 4.5 + 6;

	// Table headers
	const headers = [
		BALANCES_REPORT_COLUMNS.contractDate,
		BALANCES_REPORT_COLUMNS.client,
		BALANCES_REPORT_COLUMNS.work,
		BALANCES_REPORT_COLUMNS.concept,
		BALANCES_REPORT_COLUMNS.purchase,
		BALANCES_REPORT_COLUMNS.deliveries,
		BALANCES_REPORT_COLUMNS.balanceType,
		BALANCES_REPORT_COLUMNS.balanceAmount,
	];

	// Table data
	const data = rows.map((row) => [
		row.contractDate,
		row.client,
		row.work,
		row.concept,
		formatCurrency(row.purchaseArs),
		formatCurrency(row.deliveriesArs),
		row.balanceType,
		formatCurrency(row.balanceAmountArs),
	]);

	// Generate table
	autoTable(doc, {
		head: [headers],
		body: data,
		startY: tableStartY,
		styles: {
			fontSize: 8,
			cellPadding: 3,
			halign: 'center',
			valign: 'middle',
		},
		headStyles: {
			fillColor: [79, 92, 77], // DOCE OCHO brand color
			textColor: [255, 255, 255],
			fontStyle: 'bold',
		},
		alternateRowStyles: {
			fillColor: [245, 245, 245],
		},
		margin: { top: 10, right: 10, bottom: 10, left: 14 },
	});

	// Footer with total count
	const pageCount = doc.internal.pages.length - 1; // pages includes page 0 (config page)
	for (let i = 1; i <= pageCount; i++) {
		doc.setPage(i);
		doc.setFontSize(8);
		doc.setTextColor(150);
		doc.text(
			`Total de saldos: ${rows.length} - Página ${i} de ${pageCount}`,
			14,
			doc.internal.pageSize.height - 10
		);
	}

	// Save the PDF
	const date = new Date();
	const timestamp = `${formatCreatedAt(date)}`;
	doc.save(`saldos_${timestamp}.pdf`);
}

/**
 * Creates a human-readable description of active filters
 */
export function getFiltersDescription(filters: {
	balanceType: string;
	minPurchaseArs: string;
	maxPurchaseArs: string;
	minDeliveriesArs: string;
	maxDeliveriesArs: string;
	minBalanceArs: string;
	maxBalanceArs: string;
}): string {
	const parts: string[] = [];

	const hasValue = (v: string | number | null | undefined) =>
		v !== null && v !== undefined && String(v).trim() !== '';

	if (hasValue(filters.balanceType) && filters.balanceType !== 'all') {
		parts.push(`Tipo: ${filters.balanceType}`);
	}
	if (hasValue(filters.minPurchaseArs)) {
		parts.push(`Compra ARS mín: ${formatCurrency(parseArsToNumber(filters.minPurchaseArs))}`);
	}
	if (hasValue(filters.maxPurchaseArs)) {
		parts.push(`Compra ARS máx: ${formatCurrency(parseArsToNumber(filters.maxPurchaseArs))}`);
	}
	if (hasValue(filters.minDeliveriesArs)) {
		parts.push(`Entregas ARS mín: ${formatCurrency(parseArsToNumber(filters.minDeliveriesArs))}`);
	}
	if (hasValue(filters.maxDeliveriesArs)) {
		parts.push(`Entregas ARS máx: ${formatCurrency(parseArsToNumber(filters.maxDeliveriesArs))}`);
	}
	if (hasValue(filters.minBalanceArs)) {
		parts.push(`Saldo ARS mín: ${formatCurrency(parseArsToNumber(filters.minBalanceArs))}`);
	}
	if (hasValue(filters.maxBalanceArs)) {
		parts.push(`Saldo ARS máx: ${formatCurrency(parseArsToNumber(filters.maxBalanceArs))}`);
	}

	if (parts.length === 0) return 'Todos';
	const lines: string[] = [];
	for (let i = 0; i < parts.length; i += 2) {
		lines.push(parts.slice(i, i + 2).join(' - '));
	}
	return lines.join('\n');
}
