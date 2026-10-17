import { listBalancesForReport } from '@/lib/balances/balances';
import { getTotalsByBalanceIds } from '@/lib/balances/balance_transactions';
import {
	calculateReceivables,
	EMPTY_RECEIVABLES,
	type Receivables,
} from '@/helpers/dashboard/receivables';

/**
 * Reads every open account and works out what is left to collect.
 * Reuses the same source and totals the balances report uses, so the panel and
 * the report can never disagree.
 */
export async function getReceivables(): Promise<Receivables> {
	const { data: balances, error } = await listBalancesForReport();

	if (error) throw error;
	if (!balances?.length) return EMPTY_RECEIVABLES;

	const { data: totals, error: totalsError } = await getTotalsByBalanceIds(
		balances.map((balance) => balance.id)
	);

	if (totalsError) throw totalsError;

	return calculateReceivables(balances, totals ?? {});
}
