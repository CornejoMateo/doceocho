import { formatDateString, toISODate } from '@/helpers/calendar/date';

describe('helpers/calendar/date', () => {
	describe('formatDateString', () => {
		test('pads month and day', () => {
			expect(formatDateString(2024, 0, 3)).toBe('2024-01-03');
			expect(formatDateString(2024, 10, 15)).toBe('2024-11-15');
		});
	});

	describe('toISODate', () => {
		test('keeps a plain date', () => {
			expect(toISODate('2024-03-03')).toBe('2024-03-03');
		});

		test('strips time part from a datetime', () => {
			expect(toISODate('2024-03-03T14:30:00')).toBe('2024-03-03');
		});

		test('returns null for missing values', () => {
			expect(toISODate(undefined)).toBeNull();
		});
	});
});
