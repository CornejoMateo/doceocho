import type { MetricsSnapshot } from '@/components/business/works/metrics/metrics-tab';
import { SERIES_COMPLETED, SERIES_CREATED } from '@/components/business/works/metrics/chart-model';
import { chartLegend, chartNote, evolutionLegend } from '@/helpers/works/metrics-chart-capture';
import { generatePdf } from '@/helpers/pdf/generate-pdf';
import { pdfColumnsOf } from '@/helpers/pdf/layout';
import type { PdfDocument, PdfSection } from '@/helpers/pdf/types';
import { rankWorks } from '@/lib/works/metrics';
import { blobToDataUrl, findChartSvg, svgToPng, type LegendItem } from '@/utils/svg-to-png';
import { kpiRows, kpiWarnings, rankingTable, worksTable } from '@/helpers/works/metrics-export';

export type MetricsPdfResult = { filename: string; skipped: string[] };

function chartSection(
	title: string,
	container: () => Element | null,
	legend: LegendItem[] | undefined,
	note: string | undefined,
	emptyText: string
): PdfSection {
	return {
		type: 'image',
		title,
		emptyText,
		load: async () => {
			const svg = findChartSvg(container());
			if (!svg) return null;
			const png = await svgToPng(svg, { legend, note });
			return { dataUrl: await blobToDataUrl(png.blob), width: png.width, height: png.height };
		},
	};
}

/** Builds the Métricas PdfDocument (KPIs, charts, evolution, rankings, full detail table). */
export function buildMetricsPdfDocument(snapshot: MetricsSnapshot): PdfDocument {
	const sections: PdfSection[] = [];

	sections.push({ type: 'heading', text: 'Indicadores', reserve: 30 });
	sections.push({
		type: 'kpis',
		items: kpiRows(snapshot.kpis).map(([label, value, detail]) => ({ label, value, detail })),
	});
	for (const w of kpiWarnings(snapshot.kpis))
		sections.push({ type: 'paragraph', text: `Aviso: ${w}` });

	for (const c of snapshot.charts) {
		const rows = snapshot.chartRows[c.spec.id] ?? [];
		sections.push(
			chartSection(
				c.title,
				() => document.getElementById(c.elementId),
				chartLegend(c.spec, rows),
				chartNote(c.spec, rows),
				'Sin datos para graficar con estos filtros.'
			)
		);
	}

	sections.push(
		chartSection(
			'Evolución mensual: creadas y finalizadas',
			() => document.getElementById(snapshot.fixedElementIds.evolution),
			evolutionLegend(SERIES_CREATED, SERIES_COMPLETED),
			undefined,
			'No hay fechas para graficar con estos filtros.'
		)
	);

	sections.push({ type: 'heading', text: 'Duración de obras', reserve: 40 });
	for (const [label, by] of [
		['Más rápidas', 'fastest'],
		['Más lentas', 'slowest'],
	] as const) {
		const t = rankingTable(rankWorks(snapshot.filteredWorks, { by, limit: 5 }));
		sections.push({ type: 'paragraph', text: label, italic: false, reserve: 40 });
		sections.push({
			type: 'table',
			columns: t.headers.map((header) => ({ header })),
			rows: t.rows,
			emptyText: 'Ninguna obra finalizada tiene fechas válidas para calcular la duración.',
		});
	}

	// Every filtered row, on a landscape page for the 11 columns.
	const detail = worksTable(snapshot.filteredWorks);
	sections.push({ type: 'pageBreak', orientation: 'landscape' });
	sections.push({ type: 'heading', text: `Detalle de obras (${snapshot.filteredWorks.length})` });
	sections.push({
		type: 'table',
		columns: pdfColumnsOf({
			headers: detail.headers,
			aligns: detail.aligns ?? [],
			widths: detail.widths ?? [],
		}),
		rows: detail.rows,
	});

	return {
		title: 'Métricas de obras',
		subtitle: `Obras incluidas: ${snapshot.filteredWorks.length} de ${snapshot.totalWorks}`,
		filtersDescription: snapshot.filtersDescription,
		orientation: 'portrait',
		filenameBase: 'metricas-obras',
		sections,
	};
}

export function generateMetricsPDF(snapshot: MetricsSnapshot): Promise<MetricsPdfResult> {
	return generatePdf(buildMetricsPdfDocument(snapshot));
}
