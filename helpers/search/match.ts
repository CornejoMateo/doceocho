/**
 * Lowercases and strips accents so "cordoba" matches "Córdoba".
 * Used for matching in the browser; see `buildIlikePattern` for the database side.
 */
export function normalizeText(value: string): string {
	return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** True when every word of the term appears somewhere in the haystack. */
export function matchesTerm(term: string, ...haystack: Array<string | null | undefined>): boolean {
	const words = normalizeText(term).split(/\s+/).filter(Boolean);

	if (words.length === 0) return false;

	const target = haystack
		.filter((value): value is string => Boolean(value))
		.map(normalizeText)
		.join(' ');

	return words.every((word) => target.includes(word));
}

/** Escapes the wildcards Postgres reads inside an `ilike` pattern. */
export function buildIlikePattern(term: string): string {
	const escaped = term.trim().replace(/[\\%_]/g, (character) => `\\${character}`);

	return `%${escaped}%`;
}

/**
 * Ranks an exact prefix above a match buried in the middle, so typing "mar"
 * puts "Martínez" before "Demarchi".
 */
export function scoreMatch(term: string, title: string): number {
	const normalizedTerm = normalizeText(term);
	const normalizedTitle = normalizeText(title);

	if (normalizedTitle === normalizedTerm) return 0;
	if (normalizedTitle.startsWith(normalizedTerm)) return 1;

	const wordStart = normalizedTitle.split(/\s+/).some((word) => word.startsWith(normalizedTerm));
	if (wordStart) return 2;

	if (normalizedTitle.includes(normalizedTerm)) return 3;

	return 4;
}

export function sortByScore<T extends { title: string }>(term: string, items: T[]): T[] {
	return [...items].sort((a, b) => {
		const difference = scoreMatch(term, a.title) - scoreMatch(term, b.title);

		return difference !== 0 ? difference : a.title.localeCompare(b.title);
	});
}
