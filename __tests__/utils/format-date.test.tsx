import { formatCreatedAt, formatSimpleTime, formatTimeVideo } from '@/utils/format-date';

describe('formatCreatedAt', () => {
	it('formats valid ISO date correctly', () => {
		expect(formatCreatedAt('2024-01-15T10:00:00Z')).toBe('15/01/2024');
	});

	it('formats Date instance correctly', () => {
		const date = new Date('2025-12-25T00:00:00Z');

		expect(formatCreatedAt(date)).toBe('25/12/2025');
	});

	it('formats timestamp correctly', () => {
		const timestamp = new Date('2024-06-10T00:00:00Z');

		expect(formatCreatedAt(timestamp)).toBe('10/06/2024');
	});

	it('pads single digit day and month', () => {
		expect(formatCreatedAt('2024-02-03T00:00:00Z')).toBe('03/02/2024');
	});

	it('returns N/A for null', () => {
		expect(formatCreatedAt(null)).toBe('N/A');
	});

	it('returns N/A for undefined', () => {
		expect(formatCreatedAt(undefined)).toBe('N/A');
	});

	it('returns N/A for empty string', () => {
		expect(formatCreatedAt('')).toBe('N/A');
	});

	it('returns N/A for invalid date string', () => {
		expect(formatCreatedAt('invalid-date')).toBe('N/A');
	});

	it('returns N/A for impossible date', () => {
		expect(formatCreatedAt('2024-99-99')).toBe('N/A');
	});

	it('handles numeric strings correctly', () => {
		const timestamp = String(new Date('2023-08-20T00:00:00Z'));

		expect(formatCreatedAt(timestamp)).toBe('20/08/2023');
	});

	it('uses UTC date instead of local timezone', () => {
		expect(formatCreatedAt('2024-01-01T23:00:00-03:00')).toBe('02/01/2024');
	});

	it('handles leap year correctly', () => {
		expect(formatCreatedAt('2024-02-29T00:00:00Z')).toBe('29/02/2024');
	});
});

describe('formatSimpleTime', () => {
	it('formats time with seconds correctly', () => {
		expect(formatSimpleTime('14:30:45')).toBe('14:30');
	});

	it('formats time without seconds correctly', () => {
		expect(formatSimpleTime('14:30')).toBe('14:30');
	});

	it('handles single digit hours', () => {
		expect(formatSimpleTime('9:30:00')).toBe('9:30');
	});

	it('handles single digit minutes', () => {
		expect(formatSimpleTime('14:5:00')).toBe('14:5');
	});

	it('returns empty string for null', () => {
		expect(formatSimpleTime(null)).toBe('');
	});

	it('returns empty string for undefined', () => {
		expect(formatSimpleTime(undefined)).toBe('');
	});

	it('returns empty string for empty string', () => {
		expect(formatSimpleTime('')).toBe('');
	});

	it('handles time with milliseconds', () => {
		expect(formatSimpleTime('14:30:45.123')).toBe('14:30');
	});

	it('returns original string if format is unexpected', () => {
		expect(formatSimpleTime('invalid')).toBe('invalid');
	});
});

describe('formatTimeVideo', () => {
	it('formats 0 seconds as 00:00', () => {
		expect(formatTimeVideo(0)).toBe('00:00');
	});

	it('formats seconds under a minute correctly', () => {
		expect(formatTimeVideo(5)).toBe('00:05');
		expect(formatTimeVideo(45)).toBe('00:45');
		expect(formatTimeVideo(59)).toBe('00:59');
	});

	it('formats exactly one minute as 01:00', () => {
		expect(formatTimeVideo(60)).toBe('01:00');
	});

	it('formats minutes and seconds correctly', () => {
		expect(formatTimeVideo(65)).toBe('01:05');
		expect(formatTimeVideo(125)).toBe('02:05');
		expect(formatTimeVideo(599)).toBe('09:59');
	});

	it('pads single-digit minutes with a leading zero', () => {
		expect(formatTimeVideo(61)).toBe('01:01');
	});

	it('does not pad minutes beyond two digits when double-digit or higher', () => {
		expect(formatTimeVideo(600)).toBe('10:00');
		expect(formatTimeVideo(3600)).toBe('60:00'); // 1 hour, no hour rollover in this format
	});

	it('handles large durations (multiple hours) without truncating minutes', () => {
		expect(formatTimeVideo(7325)).toBe('122:05'); // 2h 2m 5s
	});

	it('floors fractional seconds instead of rounding', () => {
		expect(formatTimeVideo(59.9)).toBe('00:59');
		expect(formatTimeVideo(60.5)).toBe('01:00');
	});

	it('handles negative seconds without throwing (documents current behavior)', () => {
		// NOTE: current implementation does not guard against negative input.
		// This test documents the actual behavior rather than asserting correctness.
		expect(() => formatTimeVideo(-5)).not.toThrow();
	});
});
