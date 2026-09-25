import {
	MAX_HORIZONTAL_ROWS,
	truncationNote,
} from '@/components/business/works/metrics/chart-model';
import {
	chartTable,
	exportFilename,
	fitImage,
	kpiRows,
	kpiWarnings,
	worksTable,
} from '@/helpers/works/metrics-export';
import { computeKpis } from '@/lib/works/metrics';
import type { WorkWithProgress } from '@/lib/works/works';

const work = (o: Partial<WorkWithProgress>): WorkWithProgress =>
	({ id: 1, status: 'in_progress', progress: 40, hasBudget: true, ...o }) as WorkWithProgress;

describe('exportFilename', () => {
	it('builds a timestamped, filesystem-safe name', () => {
		const d = new Date('2026-09-04T12:05:00Z'); // 09:05 in Argentina (UTC-3)
		expect(exportFilename('metricas-obras', 'pdf', d)).toBe('metricas-obras_04-09-2026_0905.pdf');
		expect(exportFilename('a b/c', '.csv', d)).toBe('a-b-c_04-09-2026_0905.csv');
	});

	it('uses the Argentina date, not the machine or UTC date', () => {
		// 01:30 UTC on the 5th is still the 4th at 22:30 in Argentina.
		const d = new Date('2026-09-05T01:30:00Z');
		expect(exportFilename('x', 'pdf', d)).toBe('x_04-09-2026_2230.pdf');
	});
});

describe('fitImage', () => {
	it('scales down keeping ratio and never enlarges', () => {
		expect(fitImage(200, 100, 100, 100)).toEqual({ width: 100, height: 50 });
		expect(fitImage(100, 200, 100, 100)).toEqual({ width: 50, height: 100 });
		expect(fitImage(50, 20, 100, 100)).toEqual({ width: 50, height: 20 });
		expect(fitImage(0, 20, 100, 100)).toEqual({ width: 0, height: 0 });
	});
});

describe('worksTable', () => {
	const works = [
		work({
			id: 1,
			name: 'Cocina; "Norte"',
			created_at: '2026-01-05T12:00:00Z',
			locality: 'Palermo',
		}),
		work({
			id: 2,
			name: 'Baño',
			status: 'completed',
			progress: 100,
			created_at: '2026-03-01T12:00:00Z',
			completion_date: '2026-03-11',
		}),
	];

	it('has Spanish headers, newest first, dd/mm/yyyy dates and Sin dato', () => {
		const t = worksTable(works);
		expect(t.headers[0]).toBe('Nombre');
		expect(t.rows.map((r) => r[0])).toEqual(['Baño', 'Cocina; "Norte"']);
		expect(t.rows[0][6]).toBe('Finalizada');
		expect(t.rows[0][9]).toBe('11/03/2026');
		expect(t.rows[0][10]).toBe('10 d');
		expect(t.rows[1][2]).toBe('Palermo');
		expect(t.rows[1][3]).toBe('Sin dato');
		expect(t.rows[1][9]).toBe('Sin dato');
		expect(t.rows[1][10]).toBe('En curso');
	});

	it('exposes column alignments for the PDF (centered columns)', () => {
		const t = worksTable(works);
		expect(t.aligns).toHaveLength(t.headers.length);
		expect(t.aligns?.[t.headers.indexOf('Avance')]).toBe('center');
		expect(t.aligns?.[t.headers.indexOf('Duración')]).toBe('center');
		expect(t.aligns?.[0]).toBe('center');
	});

	it('csv variant uses numeric progress and days', () => {
		const t = worksTable(works, true);
		expect(t.headers).toContain('Avance (%)');
		expect(t.headers).toContain('Duración (días)');
		expect(t.rows[0][7]).toBe(100);
		expect(t.rows[0][10]).toBe(10);
	});

	it('includes every work (no pagination)', () => {
		const many = Array.from({ length: 35 }, (_, i) => work({ id: i + 1 }));
		expect(worksTable(many).rows).toHaveLength(35);
	});
});

describe('chartTable', () => {
	it('labels the columns from grouping and metric', () => {
		const t = chartTable('Localidad', 'avgProgress', [{ label: 'Palermo', value: 42.5, count: 2 }]);
		expect(t.headers).toEqual(['Localidad', 'Avance promedio (%)', 'Obras']);
		expect(t.rows).toEqual([['Palermo', 42.5, 2]]);
	});
});

describe('kpi helpers', () => {
	it('lists the 9 indicators and data warnings', () => {
		const k = computeKpis([work({ id: 1, status: 'completed' })]);
		expect(kpiRows(k)).toHaveLength(9);
		expect(kpiRows(k)[0]).toEqual(['Total de obras', '1', 'Según filtros activos']);
		expect(kpiWarnings(k)[0]).toMatch(/sin fecha de finalización/);
	});
});

describe('truncationNote', () => {
	it('only notes horizontal bars with more groups than can be drawn', () => {
		expect(truncationNote({ type: 'barHorizontal' }, MAX_HORIZONTAL_ROWS)).toBeNull();
		expect(truncationNote({ type: 'barHorizontal' }, MAX_HORIZONTAL_ROWS + 20)).toContain(
			`Mostrando ${MAX_HORIZONTAL_ROWS} de ${MAX_HORIZONTAL_ROWS + 20}`
		);
		expect(truncationNote({ type: 'bar' }, 500)).toBeNull();
	});
});
