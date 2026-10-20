/** Units a price can be expressed in. The label is what the seller and the client read. */
export type PriceUnit = 'm2' | 'm' | 'm3' | 'l' | 'kg' | 'unidad' | 'hora';

/** Geometry generators. Each one knows how to build its pieces from the measurements. */
export type FurnitureShape = 'mesa' | 'estanteria' | 'mueble' | 'bloque';

export type CatalogItem = {
	id: string;
	name: string;
	/** Free text so each business groups things its own way: Madera, Herrajes, Metales... */
	category: string;
	unit: PriceUnit;
	price: number;
};

export type TemplateLine = {
	itemId: string;
	/** Formula over the furniture variables, e.g. `superficie * 0.12` or `patas * 4`. */
	quantity: string;
};

/** Measurements in centimeters plus the counts each shape understands. */
export type FurnitureDimensions = {
	width: number;
	depth: number;
	height: number;
	thickness: number;
	legs: number;
	shelves: number;
	doors: number;
};

export type FurnitureTemplate = {
	id: string;
	name: string;
	shape: FurnitureShape;
	dimensions: FurnitureDimensions;
	lines: TemplateLine[];
};

export type BudgetLine = {
	id: string;
	/** null for a free line that is not in the catalog. */
	itemId: string | null;
	name: string;
	category: string;
	unit: PriceUnit;
	price: number;
	/** A plain number or a formula, so it keeps following the measurements. */
	quantity: string;
};

export type BudgetItem = {
	id: string;
	name: string;
	templateId: string | null;
	shape: FurnitureShape;
	dimensions: FurnitureDimensions;
	finish: string;
	units: number;
	notes: string;
	lines: BudgetLine[];
};

export type BudgetStatus = 'borrador' | 'enviado' | 'aprobado' | 'rechazado';

export type Budget = {
	id: string;
	number: number;
	createdAt: string;
	clientName: string;
	clientContact: string;
	status: BudgetStatus;
	marginPercent: number;
	validityDays: number;
	notes: string;
	items: BudgetItem[];
	/** Secret in the link the client receives. */
	publicToken: string;
	/** What the client answered from their page, if they did. */
	clientResponse: ClientResponse | null;
	clientComment: string | null;
	respondedAt: string | null;
};

export type ClientResponse = 'aprobado' | 'rechazado';

export type CompanyInfo = {
	name: string;
	phone: string;
	email: string;
	address: string;
};

export type BudgetBuilderSettings = {
	company: CompanyInfo;
	catalog: CatalogItem[];
	templates: FurnitureTemplate[];
	defaultMarginPercent: number;
	defaultValidityDays: number;
};
