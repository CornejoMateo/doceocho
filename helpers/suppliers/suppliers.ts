import { normalizeMoney } from '@/utils/formats-money';
import { PurchaseStatus } from '@/constants/suppliers/suppliers';

/** True when the error is a unique violation on the tax_id index. */
export function isDuplicateTaxIdError(error: any): boolean {
	const msg = String(error?.message ?? '');
	const details = String(error?.details ?? '');
	const constraint = String(error?.constraint ?? '');
	return [msg, details, constraint].some((v) => v.includes('suppliers_tax_id_unique_idx'));
}

export function purchaseStatus(purchase: {
	balanceArs: number;
	totalPaidArs: number;
}): PurchaseStatus {
	const balance = normalizeMoney(purchase.balanceArs);
	if (balance < 0) return 'a-favor';
	if (balance === 0) return 'pagada';
	if (purchase.totalPaidArs > 0) return 'parcial';
	return 'pendiente';
}
