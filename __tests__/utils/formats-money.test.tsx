import {
	formatCurrency,
	formatCurrencyUSD,
	normalizeMoney,
	formatNumber,
	parseArsToNumber,
} from '@/utils/formats-money';

describe('money utils', () => {
	describe('formatCurrency', () => {
		it('formats positive numbers as ARS currency', () => {
			const result = formatCurrency(1234.56);

			expect(result).toContain('1.234,56');
			expect(result).toContain('$');
		});

		it('formats integer values correctly', () => {
			const result = formatCurrency(1000);

			expect(result).toContain('1.000');
			expect(result).toContain('$');
		});

		it('returns $0 for null', () => {
			expect(formatCurrency(null)).toBe('$0');
		});

		it('returns $0 for undefined', () => {
			expect(formatCurrency(undefined)).toBe('$0');
		});

		it('returns $0 for zero', () => {
			expect(formatCurrency(0)).toBe('$0');
		});

		it('formats negative values correctly', () => {
			expect(formatCurrency(-1500.5)).toContain('-');
		});
	});

	describe('formatCurrencyUSD', () => {
		it('formats positive numbers as USD currency', () => {
			expect(formatCurrencyUSD(2500.75)).toContain('US$');
		});

		it('formats decimals correctly', () => {
			expect(formatCurrencyUSD(99.99)).toContain('99,99');
		});

		it('returns US$ 0 for null', () => {
			expect(formatCurrencyUSD(null)).toBe('US$ 0');
		});

		it('returns US$ 0 for undefined', () => {
			expect(formatCurrencyUSD(undefined)).toBe('US$ 0');
		});

		it('returns US$ 0 for zero', () => {
			expect(formatCurrencyUSD(0)).toBe('US$ 0');
		});
	});

	describe('normalizeMoney', () => {
		it('rounds to 3 decimal places', () => {
			expect(normalizeMoney(10.126)).toBe(10.126);
		});

		it('rounds down correctly', () => {
			expect(normalizeMoney(10.124)).toBe(10.124);
		});

		it('handles floating point precision issues', () => {
			expect(normalizeMoney(0.1 + 0.2)).toBe(0.3);
		});

		it('converts negative zero to zero', () => {
			expect(normalizeMoney(-0)).toBe(0);
			expect(Object.is(normalizeMoney(-0), -0)).toBe(false);
		});

		it('keeps integers unchanged', () => {
			expect(normalizeMoney(100)).toBe(100);
		});
	});

	describe('formatNumber', () => {
		it('formats integers with thousand separators', () => {
			expect(formatNumber('1234567')).toBe('1.234.567');
		});

		it('formats decimal numbers correctly', () => {
			expect(formatNumber('1234567,89')).toBe('1.234.567,89');
		});

		it('preserves trailing comma while typing', () => {
			expect(formatNumber('1234,')).toBe('1.234,');
		});

		it('removes invalid characters', () => {
			expect(formatNumber('abc1234xyz')).toBe('1.234');
		});

		it('removes symbols except comma', () => {
			expect(formatNumber('$1.234,56')).toBe('1.234,56');
		});

		it('returns empty string for empty input', () => {
			expect(formatNumber('')).toBe('');
		});

		it('handles only comma input', () => {
			expect(formatNumber(',')).toBe(',');
		});

		it('ignores extra commas after first decimal separator', () => {
			expect(formatNumber('123,45,67')).toBe('123,45');
		});
	});

	describe('parseArsToNumber', () => {
		it('parses formatted ARS string correctly', () => {
			expect(parseArsToNumber('1.234,56')).toBe(1234.56);
		});

		it('parses integer values correctly', () => {
			expect(parseArsToNumber('10.000')).toBe(10000);
		});

		it('parses decimal values correctly', () => {
			expect(parseArsToNumber('999,99')).toBe(999.99);
		});

		it('returns 0 for empty string', () => {
			expect(parseArsToNumber('')).toBe(0);
		});

		it('returns 0 for invalid numeric string', () => {
			expect(parseArsToNumber('abc')).toBe(0);
		});

		it('handles zero correctly', () => {
			expect(parseArsToNumber('0')).toBe(0);
		});

		it('handles large formatted numbers', () => {
			expect(parseArsToNumber('1.234.567,89')).toBe(1234567.89);
		});
	});

	describe('integration tests', () => {
		it('formatNumber + parseArsToNumber should preserve value', () => {
			const input = '1234567,89';

			const formatted = formatNumber(input);
			const parsed = parseArsToNumber(formatted);

			expect(parsed).toBe(1234567.89);
		});

		it('normalizeMoney should stabilize parsed floating values', () => {
			const parsed = parseArsToNumber('0,1') + parseArsToNumber('0,2');

			expect(normalizeMoney(parsed)).toBe(0.3);
		});
	});
});
