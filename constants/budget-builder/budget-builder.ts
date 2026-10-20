import type {
	BudgetBuilderSettings,
	BudgetStatus,
	FurnitureDimensions,
	FurnitureShape,
	PriceUnit,
} from '@/lib/budget-builder/types';

export const PRICE_UNITS: { value: PriceUnit; label: string; short: string }[] = [
	{ value: 'm2', label: 'Metro cuadrado', short: 'm²' },
	{ value: 'm', label: 'Metro lineal', short: 'm' },
	{ value: 'm3', label: 'Metro cúbico', short: 'm³' },
	{ value: 'l', label: 'Litro', short: 'l' },
	{ value: 'kg', label: 'Kilo', short: 'kg' },
	{ value: 'unidad', label: 'Unidad', short: 'u' },
	{ value: 'hora', label: 'Hora', short: 'h' },
];

export const UNIT_SHORT: Record<PriceUnit, string> = Object.fromEntries(
	PRICE_UNITS.map((unit) => [unit.value, unit.short])
) as Record<PriceUnit, string>;

/** Which counts each shape uses, so the editor only asks for what matters. */
export const SHAPES: {
	value: FurnitureShape;
	label: string;
	fields: (keyof Pick<FurnitureDimensions, 'legs' | 'shelves' | 'doors'>)[];
}[] = [
	{ value: 'mesa', label: 'Tapa con patas (mesa, banco, escritorio)', fields: ['legs'] },
	{
		value: 'estanteria',
		label: 'Estructura abierta (estantería, biblioteca)',
		fields: ['shelves'],
	},
	{
		value: 'mueble',
		label: 'Mueble con puertas (bajo mesada, placard)',
		fields: ['shelves', 'doors'],
	},
	{ value: 'bloque', label: 'Pieza simple (panel, tablero, a medida)', fields: [] },
];

export const DIMENSION_LABELS: Record<keyof FurnitureDimensions, string> = {
	width: 'Ancho',
	height: 'Alto',
	depth: 'Profundidad',
	thickness: 'Espesor',
	legs: 'Patas',
	shelves: 'Estantes',
	doors: 'Puertas',
};

/** Finishes the 3D view and the drawings understand. */
export const FINISHES: { value: string; label: string; color: string }[] = [
	{ value: 'roble', label: 'Roble natural', color: '#c8a27a' },
	{ value: 'paraiso', label: 'Paraíso', color: '#b98a5e' },
	{ value: 'nogal', label: 'Nogal', color: '#6f4e37' },
	{ value: 'pino', label: 'Pino', color: '#e0c39a' },
	{ value: 'blanco', label: 'Laqueado blanco', color: '#f2f1ee' },
	{ value: 'gris', label: 'Laqueado gris', color: '#9a9a96' },
	{ value: 'negro', label: 'Laqueado negro', color: '#2b2b2b' },
];

export const BUDGET_STATUSES: { value: BudgetStatus; label: string }[] = [
	{ value: 'borrador', label: 'Borrador' },
	{ value: 'enviado', label: 'Enviado' },
	{ value: 'aprobado', label: 'Aprobado' },
	{ value: 'rechazado', label: 'Rechazado' },
];

export const STORAGE_KEYS = {
	settings: 'budget-builder:settings',
	budgets: 'budget-builder:budgets',
} as const;

/** Route of the page the client opens to see the budget. */
export const CLIENT_VIEW_PATH = '/presupuesto';

/** A starting point so the module is usable on day one; everything here is editable. */
export const DEFAULT_SETTINGS: BudgetBuilderSettings = {
	company: { name: 'Doce Ocho', phone: '', email: '', address: '' },
	defaultMarginPercent: 40,
	defaultValidityDays: 15,
	catalog: [
		{ id: 'melamina-18', name: 'Melamina 18 mm', category: 'Placas', unit: 'm2', price: 28000 },
		{ id: 'mdf-18', name: 'MDF 18 mm', category: 'Placas', unit: 'm2', price: 24000 },
		{
			id: 'fibro-3',
			name: 'Fibrofácil 3 mm (fondos)',
			category: 'Placas',
			unit: 'm2',
			price: 6500,
		},
		{
			id: 'paraiso-macizo',
			name: 'Paraíso macizo',
			category: 'Madera',
			unit: 'm3',
			price: 1800000,
		},
		{ id: 'roble-macizo', name: 'Roble macizo', category: 'Madera', unit: 'm3', price: 3200000 },
		{ id: 'tapacanto', name: 'Tapacanto PVC 22 mm', category: 'Placas', unit: 'm', price: 450 },
		{ id: 'tornillo', name: 'Tornillo 4x40', category: 'Herrajes', unit: 'unidad', price: 60 },
		{ id: 'bisagra', name: 'Bisagra cazoleta', category: 'Herrajes', unit: 'unidad', price: 2200 },
		{ id: 'tirador', name: 'Tirador', category: 'Herrajes', unit: 'unidad', price: 3500 },
		{ id: 'cola', name: 'Cola vinílica', category: 'Insumos', unit: 'l', price: 6000 },
		{ id: 'laca', name: 'Laca poliuretánica', category: 'Terminaciones', unit: 'l', price: 22000 },
		{
			id: 'hierro-tubo',
			name: 'Caño estructural 40x40',
			category: 'Metales',
			unit: 'm',
			price: 9000,
		},
		{
			id: 'mano-obra',
			name: 'Mano de obra carpintería',
			category: 'Mano de obra',
			unit: 'hora',
			price: 12000,
		},
	],
	templates: [
		{
			id: 'mesa',
			name: 'Mesa',
			shape: 'mesa',
			dimensions: {
				width: 160,
				depth: 90,
				height: 76,
				thickness: 3,
				legs: 4,
				shelves: 0,
				doors: 0,
			},
			lines: [
				{ itemId: 'paraiso-macizo', quantity: 'volumen * 1.15' },
				{ itemId: 'tornillo', quantity: 'patas * 4' },
				{ itemId: 'cola', quantity: '0.2' },
				{ itemId: 'laca', quantity: 'superficie_total * 0.12' },
				{ itemId: 'mano-obra', quantity: '6 + superficie * 2' },
			],
		},
		{
			id: 'banco',
			name: 'Banco',
			shape: 'mesa',
			dimensions: { width: 40, depth: 35, height: 45, thickness: 3, legs: 3, shelves: 0, doors: 0 },
			lines: [
				{ itemId: 'paraiso-macizo', quantity: 'volumen * 1.15' },
				{ itemId: 'tornillo', quantity: 'patas * 4' },
				{ itemId: 'cola', quantity: '0.1' },
				{ itemId: 'laca', quantity: 'superficie_total * 0.12' },
				{ itemId: 'mano-obra', quantity: '3' },
			],
		},
		{
			id: 'biblioteca',
			name: 'Biblioteca',
			shape: 'estanteria',
			dimensions: {
				width: 90,
				depth: 30,
				height: 180,
				thickness: 1.8,
				legs: 0,
				shelves: 4,
				doors: 0,
			},
			lines: [
				{ itemId: 'melamina-18', quantity: 'superficie * 1.1' },
				{ itemId: 'fibro-3', quantity: 'ancho * alto' },
				{ itemId: 'tapacanto', quantity: 'cantos * 0.5' },
				{ itemId: 'tornillo', quantity: 'piezas * 4' },
				{ itemId: 'mano-obra', quantity: '4 + estantes * 0.5' },
			],
		},
		{
			id: 'bajo-mesada',
			name: 'Bajo mesada',
			shape: 'mueble',
			dimensions: {
				width: 120,
				depth: 58,
				height: 86,
				thickness: 1.8,
				legs: 0,
				shelves: 1,
				doors: 2,
			},
			lines: [
				{ itemId: 'melamina-18', quantity: 'superficie * 1.1' },
				{ itemId: 'tapacanto', quantity: 'cantos * 0.6' },
				{ itemId: 'bisagra', quantity: 'puertas * 2' },
				{ itemId: 'tirador', quantity: 'puertas' },
				{ itemId: 'tornillo', quantity: 'piezas * 4' },
				{ itemId: 'mano-obra', quantity: '5 + puertas' },
			],
		},
	],
};
