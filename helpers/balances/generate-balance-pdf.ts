import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BalanceReportRow } from '@/components/business/reports/balances/types';
import { formatCurrency } from '@/utils/formats-money';
import { BALANCES_REPORT_COLUMNS } from '@/constants/balances/balances-report';

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
	doc.text(`Fecha: ${dateStr}`, 14, 35);

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
			`Total de saldos: ${rows.length} - Página ${i} de ${pageCount}`,
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

	if (filters.balanceType !== 'all') {
		parts.push(`Tipo: ${filters.balanceType}`);
	}
	if (filters.minPurchaseArs) {
		parts.push(`Compra ARS mín: ${filters.minPurchaseArs}`);
	}
	if (filters.maxPurchaseArs) {
		parts.push(`Compra ARS máx: ${filters.maxPurchaseArs}`);
	}
	if (filters.minDeliveriesArs) {
		parts.push(`Entregas ARS mín: ${filters.minDeliveriesArs}`);
	}
	if (filters.maxDeliveriesArs) {
		parts.push(`Entregas ARS máx: ${filters.maxDeliveriesArs}`);
	}
	if (filters.minBalanceArs) {
		parts.push(`Saldo ARS mín: ${filters.minBalanceArs}`);
	}
	if (filters.maxBalanceArs) {
		parts.push(`Saldo ARS máx: ${filters.maxBalanceArs}`);
	}

	return parts.length > 0 ? parts.join(', ') : 'Todos';
}
