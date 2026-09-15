import {
	fitInsideBox,
	toPdfRect,
	toPixelRect,
	toPlacement,
} from '@/helpers/budgets/signature-position';
import { MIN_SIGNATURE_HEIGHT, MIN_SIGNATURE_WIDTH } from '@/constants/budgets/signatures';

describe('helpers/budgets/signature-position', () => {
	describe('toPlacement', () => {
		test('turns a drawn box into page fractions', () => {
			const placement = toPlacement({ x: 100, y: 200, width: 200, height: 50 }, 800, 1000, 2);

			expect(placement).toEqual({
				pageNumber: 2,
				x: 0.125,
				y: 0.2,
				width: 0.25,
				height: 0.05,
			});
		});

		test('keeps the box inside the page when dragged past the edge', () => {
			const placement = toPlacement({ x: 700, y: 950, width: 200, height: 100 }, 800, 1000, 1);

			expect(placement.x + placement.width).toBeLessThanOrEqual(1);
			expect(placement.y + placement.height).toBeLessThanOrEqual(1);
		});

		test('grows a box drawn too small up to the minimum', () => {
			const placement = toPlacement({ x: 10, y: 10, width: 2, height: 2 }, 800, 1000, 1);

			expect(placement.width).toBe(MIN_SIGNATURE_WIDTH);
			expect(placement.height).toBe(MIN_SIGNATURE_HEIGHT);
		});

		test('survives a page that has not been measured yet', () => {
			const placement = toPlacement({ x: 0, y: 0, width: 10, height: 10 }, 0, 0, 1);

			expect(placement.width).toBe(MIN_SIGNATURE_WIDTH);
			expect(placement.height).toBe(MIN_SIGNATURE_HEIGHT);
		});
	});

	describe('toPixelRect', () => {
		test('is the inverse of toPlacement', () => {
			const rect = { x: 100, y: 200, width: 200, height: 50 };
			const placement = toPlacement(rect, 800, 1000, 1);

			expect(toPixelRect(placement, 800, 1000)).toEqual(rect);
		});

		test('scales with the rendered size, so zoom does not move the box', () => {
			const placement = toPlacement({ x: 100, y: 200, width: 200, height: 50 }, 800, 1000, 1);

			expect(toPixelRect(placement, 1600, 2000)).toEqual({
				x: 200,
				y: 400,
				width: 400,
				height: 100,
			});
		});
	});

	describe('toPdfRect', () => {
		test('flips the origin from top left to bottom left', () => {
			const placement = { pageNumber: 1, x: 0.25, y: 0.1, width: 0.5, height: 0.2 };

			// A box 10% from the top of a 1000pt page, 200pt tall, sits at y = 700.
			expect(toPdfRect(placement, 600, 1000)).toEqual({
				x: 150,
				y: 700,
				width: 300,
				height: 200,
			});
		});

		test('a box at the very bottom lands at y = 0', () => {
			const placement = { pageNumber: 1, x: 0, y: 0.8, width: 0.5, height: 0.2 };

			expect(toPdfRect(placement, 600, 1000).y).toBeCloseTo(0);
		});
	});

	describe('fitInsideBox', () => {
		test('scales a wide signature to the box width and centres it', () => {
			const fitted = fitInsideBox(400, 100, 200, 100);

			expect(fitted.width).toBe(200);
			expect(fitted.height).toBe(50);
			expect(fitted.offsetX).toBe(0);
			expect(fitted.offsetY).toBe(25);
		});

		test('scales a tall signature to the box height and centres it', () => {
			const fitted = fitInsideBox(100, 400, 200, 100);

			expect(fitted.width).toBe(25);
			expect(fitted.height).toBe(100);
			expect(fitted.offsetX).toBe(87.5);
			expect(fitted.offsetY).toBe(0);
		});

		test('never distorts the signature', () => {
			const fitted = fitInsideBox(300, 120, 200, 100);

			expect(fitted.width / fitted.height).toBeCloseTo(300 / 120);
		});

		test('falls back to the box for an empty image', () => {
			expect(fitInsideBox(0, 0, 200, 100)).toEqual({
				width: 200,
				height: 100,
				offsetX: 0,
				offsetY: 0,
			});
		});
	});
});
