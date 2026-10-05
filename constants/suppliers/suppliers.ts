export type SupplierStatusFilter = 'active' | 'inactive' | 'all';

export const SUPPLIER_STATUS_FILTERS: { value: SupplierStatusFilter; label: string }[] = [
	{ value: 'active', label: 'Activos' },
	{ value: 'inactive', label: 'Inactivos' },
	{ value: 'all', label: 'Todos' },
];

export const SUPPLIERS_PAGE_SIZE = 10;
export const SUPPLIER_NAME_MAX_LENGTH = 120;
export const SUPPLIER_LOCALITY_MAX_LENGTH = 120;
export const SUPPLIER_ADDRESS_MAX_LENGTH = 200;
export const SUPPLIER_EMAIL_MAX_LENGTH = 254;
export const SUPPLIER_NOTES_MAX_LENGTH = 2000;

export const ALL_LOCALITIES = '__all__';
export const SUPPLIER_MAX_PAYMENT_TERMS_DAYS = 3650; // We set a maximum of 10 years for payment terms, could just take it out

export const SUPPLIER_LABELS = {
	active: 'Activo',
	inactive: 'Inactivo',
};

export const purchaseStatusLabel: Record<PurchaseStatus, string> = {
	pendiente: 'Pendiente',
	parcial: 'Parcial',
	pagada: 'Pagada',
	'a-favor': 'Saldo a favor',
};

export const purchaseStatusBadgeClassName: Record<PurchaseStatus, string> = {
	pendiente: 'border-transparent bg-muted text-muted-foreground',
	parcial: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
	pagada: 'border-transparent bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
	'a-favor': 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
};

export type PurchaseStatus = 'pendiente' | 'parcial' | 'pagada' | 'a-favor';
