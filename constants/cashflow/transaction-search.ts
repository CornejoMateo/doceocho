import { TransactionWithBankAccount } from '@/lib/cash-flow/cash-flow';
import { getPaymentMethodLabel } from '@/constants/balances/payment_methods';
import { getExpenseCategoryLabel } from '@/constants/cashflow/cashflow';

export function matchesTransactionSearch(
	transaction: TransactionWithBankAccount,
	searchTerm: string
): boolean {
	if (!searchTerm) return true;

	const searchLower = searchTerm.toLowerCase();
	const description = transaction.description?.toLowerCase() || '';
	const category = transaction.category?.toLowerCase() || '';
	const label = transaction.category
		? transaction.type === 'income'
			? getPaymentMethodLabel(transaction.category).toLowerCase()
			: getExpenseCategoryLabel(transaction.category).toLowerCase()
		: '';

	return (
		description.includes(searchLower) ||
		category.includes(searchLower) ||
		label.includes(searchLower)
	);
}
