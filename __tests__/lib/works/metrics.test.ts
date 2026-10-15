import {
	applyWorkFilters,
	computeKpis,
	defaultFilters,
	getFilterOptions,
	getWorkDuration,
	getCompletionDate,
	getCreatedDate,
	monthRange,
	resolvePeriodRange,
	availableYears,
	groupWorks,
	monthlyEvolution,
	rankWorks,
} from '@/lib/works/metrics';
import type { WorkWithProgress } from '@/lib/works/works';

let nextId = 1;
const mk = (o: Partial<WorkWithProgress> = {}): WorkWithProgress => ({
	id: nextId++,
	name: 'Obra',
	status: 'pending',
	progress: 0,
	tasks: [],
	hasNotes: false,
	hasBudget: false,
	created_at: '2026-01-10T15:00:00Z',
	...o,
});

describe('normalization and options', () => {
	it('groups accents/case/spacing and uses Sin dato for empty', () => {
		const ws = [
			mk({ locality: 'Córdoba' }),
			mk({ locality: ' cordoba ' }),
			mk({ locality: 'Córdoba' }),
			mk({ locality: '' }),
			mk({ locality: null }),
		];
		const opts = getFilterOptions(ws).locality;
		expect(opts).toEqual(
			expect.arrayContaining([
				{ value: 'cordoba', label: 'Córdoba', count: 3 },
				{ value: 'sin dato', label: 'Sin dato', count: 2 },
			])
		);
		expect(opts).toHaveLength(2);
	});
});

describe('applyWorkFilters', () => {
	const ws = [
		mk({
			locality: 'Córdoba',
			status: 'completed',
			progress: 100,
			hasBudget: true,
			address: 'Av. Ñandú 1',
			created_at: '2026-02-01T12:00:00Z',
			completion_date: '2026-03-01',
		}),
		mk({
			locality: 'Rosario',
			status: 'paused',
			progress: 40,
			client_name: 'José',
			client_last_name: 'Pérez',
			created_at: '2026-04-01T12:00:00Z',
		}),
	];
	it('multi-select is accent-insensitive via keys', () => {
		expect(applyWorkFilters(ws, { ...defaultFilters, localities: ['cordoba'] })).toHaveLength(1);
	});
	it('budget tri-state and progress range', () => {
		expect(applyWorkFilters(ws, { ...defaultFilters, hasBudget: 'with' })).toHaveLength(1);
		expect(applyWorkFilters(ws, { ...defaultFilters, hasBudget: 'without' })).toHaveLength(1);
		expect(applyWorkFilters(ws, { ...defaultFilters, progress: [50, 100] })).toHaveLength(1);
	});
	it('date ranges use date-only strings; missing completion excluded when active', () => {
		expect(
			applyWorkFilters(ws, { ...defaultFilters, createdAt: { from: '2026-03-01', to: '' } })
		).toHaveLength(1);
		expect(
			applyWorkFilters(ws, {
				...defaultFilters,
				completionDate: { from: '2026-01-01', to: '2026-12-31' },
			})
		).toHaveLength(1);
	});
	it('created_at range uses Argentina date', () => {
		const w = mk({ created_at: '2026-09-24T01:00:00Z' }); // 2026-09-23 in AR
		expect(
			applyWorkFilters([w], { ...defaultFilters, createdAt: { from: '', to: '2026-09-23' } })
		).toHaveLength(1);
		expect(
			applyWorkFilters([w], { ...defaultFilters, createdAt: { from: '2026-09-24', to: '' } })
		).toHaveLength(0);
	});
	it('text search ignores case/accents', () => {
		expect(
			applyWorkFilters(ws, { ...defaultFilters, search: 'jose perez'.split(' ')[0] })
		).toHaveLength(1);
		expect(applyWorkFilters(ws, { ...defaultFilters, search: 'NANDU' })).toHaveLength(1);
	});
});

describe('durations and KPIs', () => {
	it('uses Argentina calendar date for created_at', () => {
		const w = mk({ created_at: '2026-09-24T01:00:00Z', completion_date: '2026-09-24' });
		expect(getWorkDuration(w)).toEqual({ state: 'valid', days: 1 });
		const same = mk({ created_at: '2026-09-24T05:00:00Z', completion_date: '2026-09-24' });
		expect(getWorkDuration(same)).toEqual({ state: 'valid', days: 0 });
	});
	it('computes stats and guards negatives', () => {
		const ws = [
			mk({
				status: 'completed',
				created_at: '2026-01-01T12:00:00Z',
				completion_date: '2026-01-11',
			}), // 10
			mk({
				status: 'completed',
				created_at: '2026-01-01T12:00:00Z',
				completion_date: '2026-01-31',
			}), // 30
			mk({
				status: 'completed',
				created_at: '2026-02-01T12:00:00Z',
				completion_date: '2026-01-01',
			}), // negative
			mk({ status: 'completed' }), // no date
			mk({ status: 'in_progress', progress: 50, hasBudget: true }),
		];
		const k = computeKpis(ws);
		expect(k.total).toBe(5);
		expect(k.completed).toBe(4);
		expect(k.inProgress).toBe(1);
		expect(k.duration).toEqual({ count: 2, avg: 20, median: 20, min: 10, max: 30 });
		expect(k.negativeDurationCount).toBe(1);
		expect(k.withoutCompletionDate).toBe(2);
		expect(k.completedWithoutDate).toBe(1);
		expect(k.withoutBudget).toBe(4);
	});
});

describe('groupWorks', () => {
	it('top-N with Otros rollup', () => {
		const ws = [...['A', 'A', 'A', 'B', 'B', 'C', 'D'].map((l) => mk({ locality: l }))];
		const rows = groupWorks(ws, { groupBy: 'locality', metric: 'count', topN: 2 });
		expect(rows.map((r) => [r.label, r.value])).toEqual([
			['A', 3],
			['B', 2],
			['Otros', 2],
		]);
	});
	it('fills empty months chronologically', () => {
		const ws = [
			mk({ created_at: '2026-01-15T12:00:00Z' }),
			mk({ created_at: '2026-04-15T12:00:00Z' }),
		];
		const rows = groupWorks(ws, { groupBy: 'createdMonth', metric: 'count' });
		expect(rows.map((r) => [r.key, r.value])).toEqual([
			['2026-01', 1],
			['2026-02', 0],
			['2026-03', 0],
			['2026-04', 1],
		]);
	});
	it('avgDuration ignores works without valid duration', () => {
		const ws = [
			mk({ locality: 'A', created_at: '2026-01-01T12:00:00Z', completion_date: '2026-01-05' }),
			mk({ locality: 'A' }),
			mk({ locality: 'B' }),
		];
		const rows = groupWorks(ws, { groupBy: 'locality', metric: 'avgDuration' });
		expect(rows).toEqual([{ key: 'a', label: 'A', value: 4, count: 1 }]);
	});
});

describe('monthlyEvolution and rankWorks', () => {
	it('created vs completed per month', () => {
		const ws = [
			mk({ created_at: '2026-01-10T12:00:00Z', completion_date: '2026-03-02' }),
			mk({ created_at: '2026-01-20T12:00:00Z' }),
		];
		expect(monthlyEvolution(ws)).toEqual([
			{ month: '2026-01', created: 2, completed: 0 },
			{ month: '2026-02', created: 0, completed: 0 },
			{ month: '2026-03', created: 0, completed: 1 },
		]);
	});
	it('ranks fastest/slowest excluding invalid', () => {
		const a = mk({ created_at: '2026-01-01T12:00:00Z', completion_date: '2026-01-03' });
		const b = mk({ created_at: '2026-01-01T12:00:00Z', completion_date: '2026-01-20' });
		const bad = mk({ created_at: '2026-02-01T12:00:00Z', completion_date: '2026-01-01' });
		expect(rankWorks([a, b, bad], { by: 'fastest', limit: 5 }).map((r) => r.days)).toEqual([2, 19]);
		expect(rankWorks([a, b, bad], { by: 'slowest', limit: 1 }).map((r) => r.work.id)).toEqual([
			b.id,
		]);
	});
});

describe('progress default skip and implausible dates', () => {
	it('default [0,100] progress range does not filter, even with odd progress values', () => {
		const odd = mk({ progress: undefined as unknown as number });
		expect(applyWorkFilters([odd], defaultFilters)).toHaveLength(1);
		const narrowed = { ...defaultFilters, progress: [10, 100] as [number, number] };
		expect(applyWorkFilters([mk({ progress: 5 }), mk({ progress: 50 })], narrowed)).toHaveLength(1);
	});

	it('treats years outside 2000-2100 as invalid dates', () => {
		expect(getCompletionDate({ completion_date: '0202-03-04' })).toBeNull();
		expect(getCompletionDate({ completion_date: '2026-03-04' })).toBe('2026-03-04');
		expect(getCreatedDate({ created_at: '1970-01-01T00:00:00Z' })).toBeNull();
		const w = mk({ completion_date: '9999-01-01' });
		expect(getWorkDuration(w).state).toBe('invalid');
	});

	it('monthRange clamps to the plausible window instead of generating thousands of months', () => {
		const r = monthRange('0001-01', '9999-12');
		expect(r[0]).toBe('2000-01');
		expect(r[r.length - 1]).toBe('2100-12');
		expect(monthRange('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
	});
});

describe('resolvePeriodRange', () => {
	it('year covers Jan 1 to Dec 31 and rejects implausible years', () => {
		expect(resolvePeriodRange({ mode: 'year', year: 2026 }, '2026-09-24')).toEqual({
			from: '2026-01-01',
			to: '2026-12-31',
		});
		expect(resolvePeriodRange({ mode: 'year', year: 1850 }, '2026-09-24')).toBeNull();
		expect(resolvePeriodRange({ mode: 'none' }, '2026-09-24')).toBeNull();
	});

	it('last 1 month is the current month up to today', () => {
		expect(resolvePeriodRange({ mode: 'lastMonths', months: 1 }, '2026-09-24')).toEqual({
			from: '2026-09-01',
			to: '2026-09-24',
		});
	});

	it('last N months includes the current month and crosses year boundaries', () => {
		expect(resolvePeriodRange({ mode: 'lastMonths', months: 6 }, '2026-09-24')).toEqual({
			from: '2026-04-01',
			to: '2026-09-24',
		});
		expect(resolvePeriodRange({ mode: 'lastMonths', months: 12 }, '2026-09-24')).toEqual({
			from: '2025-10-01',
			to: '2026-09-24',
		});
		expect(resolvePeriodRange({ mode: 'lastMonths', months: 3 }, '2026-01-05')).toEqual({
			from: '2025-11-01',
			to: '2026-01-05',
		});
		expect(resolvePeriodRange({ mode: 'lastMonths', months: 12 }, '2026-12-31')).toEqual({
			from: '2026-01-01',
			to: '2026-12-31',
		});
		expect(resolvePeriodRange({ mode: 'lastMonths', months: 12 }, '2026-01-01')).toEqual({
			from: '2025-02-01',
			to: '2026-01-01',
		});
	});

	it('handles leap-year February as today', () => {
		expect(resolvePeriodRange({ mode: 'lastMonths', months: 2 }, '2024-02-29')).toEqual({
			from: '2024-01-01',
			to: '2024-02-29',
		});
	});

	it('rejects invalid N and invalid today', () => {
		expect(resolvePeriodRange({ mode: 'lastMonths', months: 0 }, '2026-09-24')).toBeNull();
		expect(resolvePeriodRange({ mode: 'lastMonths', months: 13 }, '2026-09-24')).toBeNull();
		expect(resolvePeriodRange({ mode: 'lastMonths', months: 3 }, 'hoy')).toBeNull();
	});
});

describe('period filters in applyWorkFilters', () => {
	const today = '2026-09-24';
	const ws = [
		mk({ created_at: '2026-09-10T15:00:00Z', completion_date: '2026-09-20' }),
		mk({ created_at: '2026-05-10T15:00:00Z', completion_date: '2026-06-01' }),
		mk({ created_at: '2025-05-10T15:00:00Z' }),
	];

	it('filters by creation year and last months, independently per basis', () => {
		const byYear = { ...defaultFilters, createdPeriod: { mode: 'year', year: 2026 } as const };
		expect(applyWorkFilters(ws, byYear, today)).toHaveLength(2);
		const last1 = { ...defaultFilters, createdPeriod: { mode: 'lastMonths', months: 1 } as const };
		expect(applyWorkFilters(ws, last1, today)).toEqual([ws[0]]);
		const completedLast4 = {
			...defaultFilters,
			completionPeriod: { mode: 'lastMonths', months: 4 } as const,
		};
		// works without completion date are excluded while a period is active
		expect(applyWorkFilters(ws, completedLast4, today)).toEqual([ws[0], ws[1]]);
	});

	it('combines bases and manual ranges with AND', () => {
		const f = {
			...defaultFilters,
			createdPeriod: { mode: 'year', year: 2026 } as const,
			completionPeriod: { mode: 'lastMonths', months: 1 } as const,
		};
		expect(applyWorkFilters(ws, f, today)).toEqual([ws[0]]);
		const withRange = { ...f, createdAt: { from: '2026-09-15', to: '' } };
		expect(applyWorkFilters(ws, withRange, today)).toEqual([]);
	});

	it('resolves lastMonths against the given day, not frozen dates', () => {
		const f = { ...defaultFilters, createdPeriod: { mode: 'lastMonths', months: 1 } as const };
		expect(applyWorkFilters(ws, f, '2026-05-31')).toEqual([ws[1]]);
	});
});

describe('availableYears', () => {
	it('lists valid years per basis, newest first, ignoring implausible ones', () => {
		const ys = availableYears([
			mk({ created_at: '2025-05-10T15:00:00Z', completion_date: '2026-01-02' }),
			mk({ created_at: '2026-01-10T15:00:00Z', completion_date: '0202-01-01' }),
			mk({ created_at: '1970-01-01T00:00:00Z' }),
		]);
		expect(ys.createdAt).toEqual([2026, 2025]);
		expect(ys.completionDate).toEqual([2026]);
	});
});
