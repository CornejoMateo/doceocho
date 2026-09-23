import {
	buildIlikePattern,
	matchesTerm,
	normalizeText,
	scoreMatch,
	sortByScore,
} from '@/helpers/search/match';

describe('helpers/search/match', () => {
	describe('normalizeText', () => {
		test('strips accents so a term without them still matches', () => {
			expect(normalizeText('Córdoba')).toBe('cordoba');
			expect(normalizeText('Martínez')).toBe('martinez');
			expect(normalizeText('Añatuya')).toBe('anatuya');
		});

		test('lowercases and trims', () => {
			expect(normalizeText('  Juan PÉREZ  ')).toBe('juan perez');
		});
	});

	describe('matchesTerm', () => {
		test('matches ignoring accents and case', () => {
			expect(matchesTerm('cordoba', 'Córdoba Capital')).toBe(true);
			expect(matchesTerm('PEREZ', 'Juan Pérez')).toBe(true);
		});

		test('requires every word of the term, in any order', () => {
			expect(matchesTerm('juan perez', 'Pérez Juan')).toBe(true);
			expect(matchesTerm('juan gomez', 'Pérez Juan')).toBe(false);
		});

		test('looks across every field it is given', () => {
			expect(matchesTerm('colon', 'Obra Norte', 'Av. Colón 1234')).toBe(true);
		});

		test('an empty term matches nothing', () => {
			expect(matchesTerm('', 'Juan Pérez')).toBe(false);
			expect(matchesTerm('   ', 'Juan Pérez')).toBe(false);
		});

		test('ignores null and undefined fields', () => {
			expect(matchesTerm('juan', null, undefined, 'Juan')).toBe(true);
		});
	});

	describe('buildIlikePattern', () => {
		test('wraps the term in wildcards', () => {
			expect(buildIlikePattern('perez')).toBe('%perez%');
		});

		test('escapes the wildcards Postgres would otherwise read', () => {
			expect(buildIlikePattern('100%')).toBe('%100\\%%');
			expect(buildIlikePattern('a_b')).toBe('%a\\_b%');
			expect(buildIlikePattern('a\\b')).toBe('%a\\\\b%');
		});

		test('trims before wrapping', () => {
			expect(buildIlikePattern('  perez  ')).toBe('%perez%');
		});
	});

	describe('scoreMatch', () => {
		test('ranks exact, prefix, word start and contained, in that order', () => {
			expect(scoreMatch('mar', 'mar')).toBeLessThan(scoreMatch('mar', 'Martínez'));
			expect(scoreMatch('mar', 'Martínez')).toBeLessThan(scoreMatch('mar', 'Juan Martínez'));
			expect(scoreMatch('mar', 'Juan Martínez')).toBeLessThan(scoreMatch('mar', 'Demarchi'));
		});
	});

	describe('sortByScore', () => {
		test('puts the closest match first', () => {
			const items = [
				{ title: 'Demarchi' },
				{ title: 'Martínez' },
				{ title: 'Mar' },
				{ title: 'Juan Martin' },
			];

			expect(sortByScore('mar', items).map((item) => item.title)).toEqual([
				'Mar',
				'Martínez',
				'Juan Martin',
				'Demarchi',
			]);
		});

		test('does not mutate the original array', () => {
			const items = [{ title: 'B' }, { title: 'A' }];
			sortByScore('a', items);

			expect(items.map((item) => item.title)).toEqual(['B', 'A']);
		});
	});
});
