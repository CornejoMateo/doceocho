import { normalizeMoney } from '@/utils/formats-money';

export type BalanceTotals = {
	totalAmount: number;
	totalAmountUSD: number;
	totalExtraAmount?: number | null;
	totalExtraAmountUSD?: number | null;
};

export type ReceivableBalance = {
	id: number;
	balance_amount_ars?: number | null;
	client_id?: number | null;
};

export type Receivables = {
	/** Money still to be collected, in ARS. */
	totalArs: number;
	/** Open accounts with something left to collect. */
	balancesCount: number;
	/** Distinct clients who owe something. */
	clientsCount: number;
};

export const EMPTY_RECEIVABLES: Receivables = {
	totalArs: 0,
	balancesCount: 0,
	clientsCount: 0,
};

/**
 * What is still owed across every open account.
 * Mirrors the balances report: the amount plus any extras, minus what was paid.
 * Accounts that are settled or overpaid are left out; this answers "how much is
 * there left to collect", not "what is the net position".
 */
export function calculateReceivables(
	balances: ReceivableBalance[],
	totalsByBalanceId: Record<number, BalanceTotals>
): Receivables {
	const clientIds = new Set<number>();

	let totalArs = 0;
	let balancesCount = 0;

	for (const balance of balances) {
		const totals = totalsByBalanceId[balance.id];

		const paid = totals?.totalAmount ?? 0;
		const budget = balance.balance_amount_ars ?? 0;
		const remaining = normalizeMoney(budget - paid);

		if (remaining <= 0) continue;

		totalArs += remaining;
		balancesCount++;

		if (balance.client_id) clientIds.add(balance.client_id);
	}

	return {
		totalArs: normalizeMoney(totalArs),
		balancesCount,
		clientsCount: clientIds.size,
	};
}
