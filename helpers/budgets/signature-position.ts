import { MIN_SIGNATURE_HEIGHT, MIN_SIGNATURE_WIDTH } from '@/constants/budgets/signatures';

/**
 * Signature box as fractions of the page (0 to 1), origin at the top left.
 * Storing fractions keeps the placement correct at any zoom or screen size.
 */
export type SignaturePlacement = {
	pageNumber: number;
	x: number;
	y: number;
	width: number;
	height: number;
};

/** Box drawn on screen, in pixels of the rendered page. */
export type PixelRect = {
	x: number;
	y: number;
	width: number;
	height: number;
};

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/** Turns a box drawn on the rendered page into page fractions. */
export function toPlacement(
	rect: PixelRect,
	renderedWidth: number,
	renderedHeight: number,
	pageNumber: number
): SignaturePlacement {
	if (renderedWidth <= 0 || renderedHeight <= 0) {
		return { pageNumber, x: 0, y: 0, width: MIN_SIGNATURE_WIDTH, height: MIN_SIGNATURE_HEIGHT };
	}

	const width = clamp(rect.width / renderedWidth, MIN_SIGNATURE_WIDTH, 1);
	const height = clamp(rect.height / renderedHeight, MIN_SIGNATURE_HEIGHT, 1);

	return {
		pageNumber,
		// The box has to stay fully inside the page.
		x: clamp(rect.x / renderedWidth, 0, 1 - width),
		y: clamp(rect.y / renderedHeight, 0, 1 - height),
		width,
		height,
	};
}

/** Turns page fractions back into pixels for the rendered page. */
export function toPixelRect(
	placement: SignaturePlacement,
	renderedWidth: number,
	renderedHeight: number
): PixelRect {
	return {
		x: placement.x * renderedWidth,
		y: placement.y * renderedHeight,
		width: placement.width * renderedWidth,
		height: placement.height * renderedHeight,
	};
}

/**
 * Turns page fractions into pdf-lib coordinates, which measure from the bottom
 * left instead of the top left.
 */
export function toPdfRect(
	placement: SignaturePlacement,
	pageWidth: number,
	pageHeight: number
): { x: number; y: number; width: number; height: number } {
	const width = placement.width * pageWidth;
	const height = placement.height * pageHeight;

	return {
		x: placement.x * pageWidth,
		y: pageHeight - placement.y * pageHeight - height,
		width,
		height,
	};
}

/** Fits a signature drawing inside the box without stretching it. */
export function fitInsideBox(
	imageWidth: number,
	imageHeight: number,
	boxWidth: number,
	boxHeight: number
): { width: number; height: number; offsetX: number; offsetY: number } {
	if (imageWidth <= 0 || imageHeight <= 0) {
		return { width: boxWidth, height: boxHeight, offsetX: 0, offsetY: 0 };
	}

	const scale = Math.min(boxWidth / imageWidth, boxHeight / imageHeight);
	const width = imageWidth * scale;
	const height = imageHeight * scale;

	return {
		width,
		height,
		// Centred inside the box.
		offsetX: (boxWidth - width) / 2,
		offsetY: (boxHeight - height) / 2,
	};
}
