import type { FurnitureDimensions, FurnitureShape } from '@/lib/budget-builder/types';

export type PartKind = 'board' | 'leg' | 'back' | 'door';

/** A box-shaped piece, in centimeters. Position is the center; y grows upwards, z towards the front. */
export type Part = {
	name: string;
	kind: PartKind;
	size: [number, number, number];
	position: [number, number, number];
};

const LEG_SECTION = 5;
const LEG_INSET = 4;
const BACK_THICKNESS = 0.3;
const DOOR_GAP = 0.3;

const clampCount = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, Math.round(value || 0)));

function tableParts({ width, depth, height, thickness, legs }: FurnitureDimensions): Part[] {
	const legCount = clampCount(legs, 1, 8);
	const legHeight = Math.max(height - thickness, 1);
	const legY = legHeight / 2;
	const xEdge = width / 2 - LEG_INSET - LEG_SECTION / 2;
	const zEdge = depth / 2 - LEG_INSET - LEG_SECTION / 2;

	const parts: Part[] = [
		{
			name: 'Tapa',
			kind: 'board',
			size: [width, thickness, depth],
			position: [0, height - thickness / 2, 0],
		},
	];

	const leg = (
		x: number,
		z: number,
		size: [number, number, number] = [LEG_SECTION, legHeight, LEG_SECTION]
	) => parts.push({ name: 'Pata', kind: 'leg', size, position: [x, legY, z] });

	if (legCount === 1) {
		leg(0, 0, [LEG_SECTION * 2, legHeight, LEG_SECTION * 2]);
	} else if (legCount === 2) {
		// Two panel legs, like a trestle or a desk.
		const panel: [number, number, number] = [
			thickness,
			legHeight,
			Math.max(depth - LEG_INSET * 2, 1),
		];
		leg(-(width / 2 - LEG_INSET - thickness / 2), 0, panel);
		leg(width / 2 - LEG_INSET - thickness / 2, 0, panel);
	} else if (legCount === 3) {
		leg(-xEdge, zEdge);
		leg(xEdge, zEdge);
		leg(0, -zEdge);
	} else {
		// Front and back rows, spread evenly across the width.
		const rows = [Math.ceil(legCount / 2), Math.floor(legCount / 2)];
		rows.forEach((count, rowIndex) => {
			const z = rowIndex === 0 ? zEdge : -zEdge;
			for (let i = 0; i < count; i++) {
				const x = count === 1 ? 0 : -xEdge + (2 * xEdge * i) / (count - 1);
				leg(x, z);
			}
		});
	}

	return parts;
}

function carcassParts(
	{ width, depth, height, thickness, shelves }: FurnitureDimensions,
	withBack: boolean
): Part[] {
	const innerWidth = Math.max(width - thickness * 2, 1);
	const shelfCount = clampCount(shelves, 0, 12);
	const innerBottom = thickness;
	const innerTop = height - thickness;
	const gap = (innerTop - innerBottom) / (shelfCount + 1);

	const parts: Part[] = [
		{
			name: 'Lateral',
			kind: 'board',
			size: [thickness, height, depth],
			position: [-(width / 2 - thickness / 2), height / 2, 0],
		},
		{
			name: 'Lateral',
			kind: 'board',
			size: [thickness, height, depth],
			position: [width / 2 - thickness / 2, height / 2, 0],
		},
		{
			name: 'Techo',
			kind: 'board',
			size: [innerWidth, thickness, depth],
			position: [0, height - thickness / 2, 0],
		},
		{
			name: 'Piso',
			kind: 'board',
			size: [innerWidth, thickness, depth],
			position: [0, thickness / 2, 0],
		},
	];

	for (let i = 1; i <= shelfCount; i++) {
		parts.push({
			name: 'Estante',
			kind: 'board',
			size: [innerWidth, thickness, depth - 1],
			position: [0, innerBottom + gap * i, -0.5],
		});
	}

	if (withBack) {
		parts.push({
			name: 'Fondo',
			kind: 'back',
			size: [width, height, BACK_THICKNESS],
			position: [0, height / 2, -depth / 2 + BACK_THICKNESS / 2],
		});
	}

	return parts;
}

function cabinetParts(dimensions: FurnitureDimensions): Part[] {
	const { width, depth, height, thickness, doors } = dimensions;
	const doorCount = clampCount(doors, 0, 6);
	const parts = carcassParts(dimensions, true);

	if (doorCount > 0) {
		const doorWidth = width / doorCount - DOOR_GAP;
		for (let i = 0; i < doorCount; i++) {
			parts.push({
				name: 'Puerta',
				kind: 'door',
				size: [doorWidth, height - DOOR_GAP * 2, thickness],
				position: [
					-width / 2 + (width / doorCount) * (i + 0.5),
					height / 2,
					depth / 2 + thickness / 2,
				],
			});
		}
	}

	return parts;
}

export function buildParts(shape: FurnitureShape, dimensions: FurnitureDimensions): Part[] {
	switch (shape) {
		case 'mesa':
			return tableParts(dimensions);
		case 'estanteria':
			return carcassParts(dimensions, true);
		case 'mueble':
			return cabinetParts(dimensions);
		default:
			return [
				{
					name: 'Pieza',
					kind: 'board',
					size: [dimensions.width, dimensions.height, dimensions.depth],
					position: [0, dimensions.height / 2, 0],
				},
			];
	}
}

const CM2_TO_M2 = 1 / 10_000;
const CM3_TO_M3 = 1 / 1_000_000;

/** Variables a quantity formula can use, in meters, square meters and cubic meters. */
export const FORMULA_VARIABLES: { name: string; description: string }[] = [
	{ name: 'ancho', description: 'Ancho total (m)' },
	{ name: 'alto', description: 'Alto total (m)' },
	{ name: 'profundidad', description: 'Profundidad total (m)' },
	{ name: 'espesor', description: 'Espesor de placa (m)' },
	{ name: 'patas', description: 'Cantidad de patas' },
	{ name: 'estantes', description: 'Cantidad de estantes' },
	{ name: 'puertas', description: 'Cantidad de puertas' },
	{ name: 'piezas', description: 'Cantidad de piezas' },
	{ name: 'superficie', description: 'Placa necesaria: cara principal de cada pieza (m²)' },
	{ name: 'superficie_total', description: 'Todas las caras, para laca o pintura (m²)' },
	{ name: 'cantos', description: 'Largo de cantos a cubrir (m)' },
	{ name: 'volumen', description: 'Volumen de madera (m³)' },
];

/** Measures the pieces so formulas like `superficie * 1.1` follow every change of size. */
export function computeVariables(
	dimensions: FurnitureDimensions,
	parts: Part[]
): Record<string, number> {
	let surface = 0;
	let totalSurface = 0;
	let edges = 0;
	let volume = 0;

	for (const part of parts) {
		const [a, b, c] = [...part.size].sort((x, y) => y - x);
		surface += a * b;
		totalSurface += 2 * (a * b + b * c + a * c);
		edges += 2 * (a + b);
		volume += a * b * c;
	}

	const round = (value: number) => Math.round(value * 10_000) / 10_000;

	return {
		ancho: dimensions.width / 100,
		alto: dimensions.height / 100,
		profundidad: dimensions.depth / 100,
		espesor: dimensions.thickness / 100,
		patas: parts.filter((part) => part.kind === 'leg').length,
		estantes: parts.filter((part) => part.name === 'Estante').length,
		puertas: parts.filter((part) => part.kind === 'door').length,
		piezas: parts.length,
		superficie: round(surface * CM2_TO_M2),
		superficie_total: round(totalSurface * CM2_TO_M2),
		cantos: round(edges / 100),
		volumen: round(volume * CM3_TO_M3),
	};
}
