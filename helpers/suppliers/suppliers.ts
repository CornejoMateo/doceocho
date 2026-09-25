/** True when the error is a unique violation on the tax_id index. */
export function isDuplicateTaxIdError(error: any): boolean {
	const msg = String(error?.message ?? '');
	const details = String(error?.details ?? '');
	const constraint = String(error?.constraint ?? '');
	return [msg, details, constraint].some((v) => v.includes('suppliers_tax_id_unique_idx'));
}
