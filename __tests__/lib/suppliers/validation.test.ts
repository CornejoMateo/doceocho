import { onlyDigits, formatCuit, getWhatsappUrl, isValidEmail } from '@/lib/suppliers/validation';

describe('onlyDigits', () => {
	it('removes everything that is not a digit', () => {
		expect(onlyDigits('30-71234567-8')).toBe('30712345678');
		expect(onlyDigits('+54 9 11 1234-5678')).toBe('5491112345678');
		expect(onlyDigits('abc')).toBe('');
	});
});

describe('formatCuit', () => {
	it('formats 11 digits as XX-XXXXXXXX-X', () => {
		expect(formatCuit('30712345678')).toBe('30-71234567-8');
		expect(formatCuit('30-71234567-8')).toBe('30-71234567-8');
	});

	it('returns the input untouched when it does not have 11 digits', () => {
		expect(formatCuit('1234')).toBe('1234');
	});

	it('returns an empty string for null, undefined or empty values', () => {
		expect(formatCuit(null)).toBe('');
		expect(formatCuit(undefined)).toBe('');
		expect(formatCuit('')).toBe('');
	});
});

describe('getWhatsappUrl', () => {
	it('builds a wa.me link using digits only', () => {
		expect(getWhatsappUrl('+54 9 11 1234-5678')).toBe('https://wa.me/5491112345678');
	});
});

describe('isValidEmail', () => {
	it.each(['a.b+c@sub.example.com.ar', 'x_y@d-e.co', 'user@example.com'])('accepts %s', (email) => {
		expect(isValidEmail(email)).toBe(true);
	});

	it.each([
		'with space@example.com',
		'user@exa mple.com',
		'"quoted"@example.com',
		"o'neil@example.com",
		'user@example.com?subject=x',
		'us?er@example.com',
		'user@exa?mple.com',
		'user&x@example.com',
		'a,b@example.com',
		'a;b@example.com',
		'a=b@example.com',
		'<a>@example.com',
		'user@example',
		'user@example.c',
		'no-at-sign.com',
		'',
	])('rejects %j', (email) => {
		expect(isValidEmail(email)).toBe(false);
	});

	it('rejects addresses longer than 254 characters', () => {
		const long = `${'a'.repeat(250)}@example.com`;
		expect(isValidEmail(long)).toBe(false);
	});
});
