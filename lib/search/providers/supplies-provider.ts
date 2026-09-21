import { Package } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { buildIlikePattern } from '@/helpers/search/match';
import { RESULTS_PER_PROVIDER } from '@/constants/search/search';
import type { SearchProvider, SearchResult } from '@/lib/search/types';

type SupplyRow = {
	id: number;
	supply_code: string;
	supply_description: string | null;
	supply_category: string | null;
	supply_brand: string | null;
	supply_color: string | null;
	supply_quantity: number | null;
};

function toResult(supply: SupplyRow): SearchResult {
	const details = [supply.supply_brand, supply.supply_color].filter(Boolean).join(' · ');
	const stock = supply.supply_quantity !== null ? `Stock: ${supply.supply_quantity}` : null;

	return {
		id: `supplies:${supply.id}`,
		title: supply.supply_description || supply.supply_code,
		subtitle: [details, stock].filter(Boolean).join(' — ') || undefined,
		icon: Package,
		href: '/supplies',
		keywords: [supply.supply_code, supply.supply_category].filter((value): value is string =>
			Boolean(value)
		),
	};
}

export const suppliesProvider: SearchProvider = {
	id: 'supplies',
	label: 'Insumos',
	roles: ['Admin', 'Taller'],
	order: 4,
	async search(term, signal) {
		const supabase = getSupabaseClient();
		const pattern = buildIlikePattern(term);

		const { data, error } = await supabase
			.from('stock_supplies')
			.select(
				'id, supply_code, supply_description, supply_category, supply_brand, supply_color, supply_quantity'
			)
			.or(
				`supply_code.ilike.${pattern},supply_description.ilike.${pattern},supply_brand.ilike.${pattern},supply_category.ilike.${pattern}`
			)
			.limit(RESULTS_PER_PROVIDER)
			.abortSignal(signal);

		if (error) throw error;

		return (data ?? []).map(toResult);
	},
};
