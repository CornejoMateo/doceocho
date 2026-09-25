import { CSV_BOM, buildCsv, escapeCsvCell } from '@/utils/csv';

describe('escapeCsvCell', () => {
	it('leaves plain values untouched and empties null/undefined', () => {
		expect(escapeCsvCell('Palermo')).toBe('Palermo');
		expect(escapeCsvCell(12.5)).toBe('12,5');
		expect(escapeCsvCell(12.5, ',')).toBe('12.5');
		expect(escapeCsvCell(1234567.25)).toBe('1234567,25');
		expect(escapeCsvCell(0.1 + 0.2)).toBe('0,3');
		expect(escapeCsvCell(-5.5)).toBe('-5,5');
		expect(escapeCsvCell(null)).toBe('');
		expect(escapeCsvCell(undefined)).toBe('');
		expect(escapeCsvCell(NaN)).toBe('');
	});

	it('quotes delimiter, quotes and line breaks, doubling inner quotes', () => {
		expect(escapeCsvCell('a;b')).toBe('"a;b"');
		expect(escapeCsvCell('dice "hola"')).toBe('"dice ""hola"""');
		expect(escapeCsvCell('l1\nl2')).toBe('"l1\nl2"');
	});

	it('does not quote commas with the default ; delimiter', () => {
		expect(escapeCsvCell('12,5')).toBe('12,5');
		expect(escapeCsvCell('a,b', ',')).toBe('"a,b"');
	});

	it('neutralizes spreadsheet formulas but keeps negative numbers', () => {
		expect(escapeCsvCell('=SUM(A1)')).toBe("'=SUM(A1)");
		expect(escapeCsvCell('@cmd')).toBe("'@cmd");
		expect(escapeCsvCell('-cmd')).toBe("'-cmd");
		expect(escapeCsvCell('-5,5')).toBe('-5,5');
		expect(escapeCsvCell('-5')).toBe('-5');
		expect(escapeCsvCell('-1+1')).toBe("'-1+1");
		expect(escapeCsvCell('-2+3|cmd')).toBe("'-2+3|cmd");
		expect(escapeCsvCell('+5')).toBe("'+5");
		expect(escapeCsvCell(-5)).toBe('-5');
	});
});

describe('buildCsv', () => {
	it('starts with a UTF-8 BOM, uses ; and CRLF, keeps accents', () => {
		const csv = buildCsv(['Duración', 'Nombre'], [[3, 'Añón; "X"']]);
		expect(csv.startsWith(CSV_BOM)).toBe(true);
		expect(csv).toBe(`${CSV_BOM}Duración;Nombre\r\n3;"Añón; ""X"""\r\n`);
	});

	it('can omit the BOM', () => {
		expect(buildCsv(['a'], [], { bom: false })).toBe('a\r\n');
	});
});
