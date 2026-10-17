import { sanitizePdfText } from '@/helpers/pdf/sanitize';

describe('sanitizePdfText', () => {
	it('keeps Spanish text, Latin-1 and cp1252 extras', () => {
		expect(sanitizePdfText('Ñandú, cañón – “ok” … € ½')).toBe('Ñandú, cañón – “ok” … € ½');
	});
	it('maps the minus sign to a hyphen', () => {
		expect(sanitizePdfText('−5')).toBe('-5');
	});
	it('strips zero-width and control characters, keeps newlines, tabs become spaces', () => {
		expect(sanitizePdfText('a\u200Bb\uFEFFc\u0000d\u007Fe\u0085f')).toBe('abcdef');
		expect(sanitizePdfText('a\tb\nc')).toBe('a b\nc');
	});
	it('replaces glyphs outside WinAnsi with one ? per character', () => {
		expect(sanitizePdfText('Łódź')).toBe('?ód?');
		expect(sanitizePdfText('ok 😀 漢字 ő')).toBe('ok ? ?? ?');
	});
});
