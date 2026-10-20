import type { FurnitureDimensions, FurnitureShape } from '@/lib/budget-builder/types';
import { buildParts, type PartKind } from '@/helpers/budget-builder/geometry';

export type DrawingView = 'frente' | 'lateral' | 'planta';

export type ViewRect = {
	x: number;
	y: number;
	w: number;
	h: number;
	kind: PartKind;
	/** Covered by pieces closer to the viewer: drawn dashed, the way plans show hidden lines. */
	hidden: boolean;
};

export type ViewDrawing = {
	view: DrawingView;
	rects: ViewRect[];
	/** Overall size of the view in cm: horizontal and vertical. */
	width: number;
	height: number;
};

/** Horizontal, vertical and depth axes of each view; depth grows towards the viewer. */
const AXES: Record<DrawingView, [number, number, number]> = {
	frente: [0, 1, 2],
	lateral: [2, 1, 0],
	planta: [0, 2, 1],
};

// Small gaps between pieces (door joints, shelf setbacks) still count as covered.
const COVER_TOLERANCE = 0.5;
const SAMPLES = [0.08, 0.3, 0.5, 0.7, 0.92];

type Box = { x0: number; x1: number; y0: number; y1: number; near: number; far: number };

/** A piece is hidden when every sample point of it sits behind some closer piece. */
function isHidden(target: Box, others: Box[]): boolean {
	// Closer means its visible face sits further towards the viewer than the target's.
	const closer = others.filter(
		(other) => other !== target && other.far > target.far + 0.01 && other.near >= target.near - 0.01
	);
	if (closer.length === 0) return false;

	return SAMPLES.every((fx) =>
		SAMPLES.every((fy) => {
			const x = target.x0 + (target.x1 - target.x0) * fx;
			const y = target.y0 + (target.y1 - target.y0) * fy;
			return closer.some(
				(other) =>
					x >= other.x0 - COVER_TOLERANCE &&
					x <= other.x1 + COVER_TOLERANCE &&
					y >= other.y0 - COVER_TOLERANCE &&
					y <= other.y1 + COVER_TOLERANCE
			);
		})
	);
}

/**
 * Orthographic projection of the pieces, in cm, with the origin at the top-left corner
 * of the view (y grows downwards, like a page), ready to be drawn on paper.
 */
export function projectView(
	shape: FurnitureShape,
	dimensions: FurnitureDimensions,
	view: DrawingView
): ViewDrawing {
	const parts = buildParts(shape, dimensions);
	const [hAxis, vAxis, dAxis] = AXES[view];

	const boxes = parts.map((part) => {
		const span = (axis: number) => [
			part.position[axis] - part.size[axis] / 2,
			part.position[axis] + part.size[axis] / 2,
		];
		const [x0, x1] = span(hAxis);
		const [y0, y1] = span(vAxis);
		const [near, far] = span(dAxis);
		return { kind: part.kind, x0, x1, y0, y1, near, far };
	});

	const minX = Math.min(...boxes.map((b) => b.x0));
	const maxX = Math.max(...boxes.map((b) => b.x1));
	const minY = Math.min(...boxes.map((b) => b.y0));
	const maxY = Math.max(...boxes.map((b) => b.y1));

	// Front and side views have height going up; the top view has depth going towards the viewer.
	const flipVertical = view !== 'planta';

	const rects = boxes.map((box) => ({
		kind: box.kind,
		hidden: isHidden(box, boxes),
		x: box.x0 - minX,
		y: flipVertical ? maxY - box.y1 : box.y0 - minY,
		w: box.x1 - box.x0,
		h: box.y1 - box.y0,
	}));

	// Hidden lines first, then back panels, so visible pieces draw over both.
	rects.sort(
		(a, b) =>
			Number(b.hidden) - Number(a.hidden) || Number(b.kind === 'back') - Number(a.kind === 'back')
	);

	return { view, rects, width: maxX - minX, height: maxY - minY };
}
