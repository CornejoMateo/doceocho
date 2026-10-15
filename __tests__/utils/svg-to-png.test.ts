import { MAX_CANVAS_AREA, MAX_CANVAS_DIMENSION, clampScale } from '@/utils/svg-to-png';

describe('clampScale (pure canvas size guard)', () => {
	it('keeps the requested scale for normal charts', () => {
		expect(clampScale(800, 400, 2)).toBe(2);
	});
	it('reduces the scale for very tall charts, within both limits', () => {
		const s = clampScale(800, 6000, 2);
		expect(s).toBeLessThan(2);
		expect(6000 * s).toBeLessThanOrEqual(MAX_CANVAS_DIMENSION);
		expect(800 * 6000 * s * s).toBeLessThanOrEqual(MAX_CANVAS_AREA + 1);
	});
	it('returns 0 for empty sizes', () => {
		expect(clampScale(0, 100, 2)).toBe(0);
	});
});
