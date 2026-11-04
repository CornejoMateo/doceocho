export type ClientTab = 'info' | 'works' | 'budgets' | 'balances' | 'images';

/** Tabs of the client detail, in the order they are shown. Each value is also its view key suffix. */
export const CLIENT_TABS: { value: ClientTab; label: string }[] = [
	{ value: 'info', label: 'Información' },
	{ value: 'works', label: 'Obras' },
	{ value: 'budgets', label: 'Presupuestos' },
	{ value: 'balances', label: 'Cuentas corrientes' },
	{ value: 'images', label: 'Archivos' },
];

export function isClientTab(value: string | null | undefined): value is ClientTab {
	return CLIENT_TABS.some((tab) => tab.value === value);
}
