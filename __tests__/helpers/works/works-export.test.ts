import { CSV_BOM } from '@/utils/csv';
import { DEFAULT_WORK_COLUMN_KEYS, WORK_COLUMNS } from '@/helpers/works/works-columns';
import {
	buildWorksCsv,
	buildWorksPdfDocument,
	resolveOrientation,
} from '@/helpers/works/works-export';
import type { WorkWithProgress } from '@/lib/works/works';

const mk = (o: Partial<WorkWithProgress>): WorkWithProgress =>
	({
		id: 1,
		name: 'Obra',
		status: 'completed',
		progress: 100,
		tasks: [
			{ id: 1, description: 'a', done: true, checklist_id: 7, sort_order: 0 },
			{ id: 2, description: 'b', done: false, checklist_id: 7, sort_order: 1 },
			{ id: 3, description: 'c', done: false, checklist_id: 8, sort_order: 0 },
		],
		hasNotes: false,
		hasBudget: true,
		created_at: '2026-03-01T12:00:00Z',
		completion_date: '2026-03-11',
		...o,
	}) as WorkWithProgress;

describe('works columns', () => {
	it('has unique keys and every default key exists', () => {
		const keys = WORK_COLUMNS.map((c) => c.key);
		expect(new Set(keys).size).toBe(keys.length);
		DEFAULT_WORK_COLUMN_KEYS.forEach((k) => expect(keys).toContain(k));
	});

	it('formats dates dd/mm/yyyy, duration in days and counts checklists', () => {
		const w = mk({});
		const get = (key: string, mode: 'pdf' | 'csv') =>
			WORK_COLUMNS.find((c) => c.key === key)!.accessor(w, mode);
		expect(get('completed', 'pdf')).toBe('11/03/2026');
		expect(get('created', 'csv')).toBe('01/03/2026');
		expect(get('duration', 'pdf')).toBe('10 d');
		expect(get('duration', 'csv')).toBe(10);
		expect(get('progress', 'pdf')).toBe('100%');
		expect(get('progress', 'csv')).toBe(100);
		expect(get('checklists', 'pdf')).toBe(2);
		expect(get('budget', 'pdf')).toBe('Con');
	});
});

describe('numeric columns in CSV mode', () => {
	const dur = WORK_COLUMNS.find((c) => c.key === 'duration')!;
	it('emit an empty cell for non-numeric duration states and keep text in pdf mode', () => {
		const inProgress = mk({ completion_date: null, status: 'in_progress' });
		const noCreated = mk({ created_at: undefined });
		const negative = mk({ completion_date: '2026-01-01' });
		expect(dur.accessor(inProgress, 'csv')).toBe('');
		expect(dur.accessor(inProgress, 'pdf')).toBe('En curso');
		expect(dur.accessor(noCreated, 'csv')).toBe('');
		expect(dur.accessor(negative, 'csv')).toBe('');
		expect(dur.accessor(negative, 'pdf')).toBe('Fechas inválidas');
	});
});

describe('works export builders', () => {
	const works = [mk({ id: 2, name: 'Segunda' }), mk({ id: 1, name: 'Primera; "x"' })];

	it('csv keeps the given order, canonical column order, BOM and comma decimals', () => {
		const csv = buildWorksCsv(works, ['progress', 'name', 'duration']);
		expect(csv.startsWith(CSV_BOM)).toBe(true);
		const lines = csv.slice(1).trim().split('\r\n');
		expect(lines[0]).toBe('Nombre;Avance (%);Duración (días)');
		expect(lines[1]).toBe('Segunda;100;10');
		expect(lines[2]).toBe('"Primera; ""x""";100;10');
	});

	it('pdf document is a single table with count, filters and resolved orientation', () => {
		const doc = buildWorksPdfDocument(works, DEFAULT_WORK_COLUMN_KEYS, {
			orientation: 'auto',
			filtersDescription: ['Estado: Finalizada'],
			totalWorks: 40,
		});
		expect(doc.subtitle).toBe('Obras incluidas: 2 de 40');
		expect(doc.filtersDescription).toEqual(['Estado: Finalizada']);
		expect(doc.orientation).toBe('landscape'); // 8 default columns > 6
		expect(doc.margin).toEqual({ top: 12, right: 8, bottom: 12, left: 8 });
		expect(doc.compact).toBe(true);
		expect(doc.sections).toHaveLength(1);
		const section = doc.sections[0];
		expect(section.type).toBe('table');
		if (section.type === 'table') {
			expect(section.rows).toHaveLength(2);
			expect(section.columns.every((c) => (c.weight ?? 0) > 0)).toBe(true);
			const w = (h: string) => section.columns.find((c) => c.header === h)!.weight!;
			expect(w('Nombre')).toBeGreaterThan(w('Avance'));
		}
	});

	it('orientation choice overrides the default', () => {
		expect(resolveOrientation('auto', 3)).toBe('portrait');
		expect(resolveOrientation('portrait', 12)).toBe('portrait');
		expect(resolveOrientation('landscape', 2)).toBe('landscape');
	});
});
