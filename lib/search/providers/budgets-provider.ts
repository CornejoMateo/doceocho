import { FileText } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { buildIlikePattern } from '@/helpers/search/match';
import { formatCurrency } from '@/utils/formats-money';
import { RESULTS_PER_PROVIDER } from '@/constants/search/search';
import type { SearchProvider, SearchResult } from '@/lib/search/types';

type BudgetRow = {
	id: number;
	number: string | null;
	type: string | null;
	amount_ars: number | null;
	folder_budget: { client_id: number | null } | null;
};

function toResult(budget: BudgetRow): SearchResult {
	const clientId = budget.folder_budget?.client_id ?? null;
	const details = [budget.type, budget.amount_ars ? formatCurrency(budget.amount_ars) : null]
		.filter(Boolean)
		.join(' · ');

	return {
		id: `budgets:${budget.id}`,
		title: budget.number ? `Presupuesto ${budget.number}` : 'Presupuesto sin número',
		subtitle: details || undefined,
		icon: FileText,
		// Budgets live inside the client file, so that is where the result lands.
		href: clientId ? `/clients?clientId=${clientId}` : '/clients',
		keywords: [budget.type].filter((value): value is string => Boolean(value)),
	};
}

export const budgetsProvider: SearchProvider = {
	id: 'budgets',
	label: 'Presupuestos',
	// Matches the table's own RLS, which is admin only.
	roles: ['Admin'],
	order: 3,
	async search(term, signal) {
		const supabase = getSupabaseClient();
		const pattern = buildIlikePattern(term);

		const { data, error } = await supabase
			.from('budgets')
			.select('id, number, type, amount_ars, folder_budget:folder_budgets(client_id)')
			.or(`number.ilike.${pattern},type.ilike.${pattern}`)
			.limit(RESULTS_PER_PROVIDER)
			.abortSignal(signal)
			.returns<BudgetRow[]>();

		if (error) throw error;

		return (data ?? []).map(toResult);
	},
};
