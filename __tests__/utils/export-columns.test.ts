import {
	buildTableFromColumns,
	parseStoredKeys,
	selectColumns,
	type ExportColumn,
} from '@/utils/export-columns';

type Row = { name: string; n: number };
const cols: ExportColumn<Row>[] = [
	{ key: 'name', label: 'Nombre', accessor: (r) => r.name },
	{
		key: 'n',
		label: 'Cantidad',
		csvLabel: 'Cantidad (u)',
		align: 'right',
		width: 20,
		accessor: (r, mode) => (mode === 'csv' ? r.n : `${r.n} u`),
	},
];

describe('buildTableFromColumns', () => {
	const rows = [{ name: 'A', n: 2 }];
	it('uses display values and labels for pdf', () => {
		const t = buildTableFromColumns(rows, cols, 'pdf');
		expect(t.headers).toEqual(['Nombre', 'Cantidad']);
		expect(t.rows).toEqual([['A', '2 u']]);
		expect(t.aligns).toEqual(['left', 'right']);
		expect(t.widths).toEqual([undefined, 20]);
	});
	it('uses raw values and csv labels for csv', () => {
		const t = buildTableFromColumns(rows, cols, 'csv');
		expect(t.headers).toEqual(['Nombre', 'Cantidad (u)']);
		expect(t.rows).toEqual([['A', 2]]);
	});
	it('turns null/undefined into empty cells', () => {
		const t = buildTableFromColumns(
			[{ name: 'A', n: 1 }],
			[{ ...cols[0], accessor: () => null }],
			'csv'
		);
		expect(t.rows).toEqual([['']]);
	});
});

describe('column selection', () => {
	it('keeps canonical order and drops unknown keys', () => {
		expect(selectColumns(cols, ['n', 'zzz', 'name']).map((c) => c.key)).toEqual(['name', 'n']);
		expect(selectColumns(cols, [])).toEqual([]);
	});

	it('parses stored keys defensively', () => {
		const valid = ['name', 'n'];
		const def = ['name'];
		expect(parseStoredKeys(null, valid, def)).toBe(def);
		expect(parseStoredKeys('not json', valid, def)).toBe(def);
		expect(parseStoredKeys('{"a":1}', valid, def)).toBe(def);
		expect(parseStoredKeys('["n","bogus",3]', valid, def)).toEqual(['n']);
		expect(parseStoredKeys('["bogus"]', valid, def)).toBe(def);
	});
});
