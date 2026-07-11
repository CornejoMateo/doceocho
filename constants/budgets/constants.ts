export const BUDGET_VARIANTS = ['Mínimo', 'Estándar', 'Óptimo'] as const;

export type BudgetVariant = (typeof BUDGET_VARIANTS)[number];

export const FORM_DEFAULTS = {
	type: 'MDF',
	number: '',
	amount: '',
	amountUsd: '',
	usdRate: '',
	workId: 'none',
	usdQuote: '',
	date_of_sale: '',
	created_at: new Date()
		.toLocaleDateString('es-AR', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		})
		.split('/')
		.reverse()
		.join('-'), // YYYY-MM-DD format using local date
} as const;

export const TOAST_MESSAGES = {
	budgetCreated: 'Presupuesto creado',
	budgetUpdated: 'Presupuesto actualizado',
	budgetDeleted: 'Presupuesto eliminado',
	folderDeleted: 'Carpeta eliminada',
	budgetChosen: 'Presupuesto elegido',
	budgetUnchosen: 'Presupuesto deseleccionado',
	soldMarked: 'Presupuesto marcado como vendido',
	soldUnmarked: 'Presupuesto marcado como no vendido',
	lostMarked: 'Presupuesto marcado como perdido',
	lostUnmarked: 'Presupuesto marcado como no perdido',
	pricesUpdated: 'Presupuestos actualizados',
} as const;
