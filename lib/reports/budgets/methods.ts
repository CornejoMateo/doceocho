import { getSupabaseClient } from '@/lib/supabase-client';
import { BudgetWithWorkAndClient } from '@/lib/budgets/budgets';

const TABLE = 'budgets';

export async function getBudgetsTotalAmount(): Promise<{
	data: { totalArs: number; totalUsd: number };
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('amount_ars, amount_usd');

	if (error) return { data: { totalArs: 0, totalUsd: 0 }, error };
	if (!data) return { data: { totalArs: 0, totalUsd: 0 }, error: null };

	const totalArs = data.reduce((sum, budget) => sum + (budget.amount_ars || 0), 0);
	const totalUsd = data.reduce((sum, budget) => sum + (budget.amount_usd || 0), 0);

	return { data: { totalArs, totalUsd }, error: null };
}

export async function getAcceptedBudgetsCount(): Promise<{ data: number; error: any }> {
	const supabase = getSupabaseClient();
	const { count, error } = await supabase
		.from(TABLE)
		.select('*', { count: 'exact', head: true })
		.eq('accepted', true);
	return { data: count || 0, error };
}

export async function getSoldBudgetsCount(): Promise<{ data: number; error: any }> {
	const supabase = getSupabaseClient();
	const { count, error } = await supabase
		.from(TABLE)
		.select('*', { count: 'exact', head: true })
		.eq('sold', true);
	return { data: count || 0, error };
}

export async function getLostBudgetsCount(): Promise<{ data: number; error: any }> {
	const supabase = getSupabaseClient();
	const { count, error } = await supabase
		.from(TABLE)
		.select('*', { count: 'exact', head: true })
		.eq('lost', true);
	return { data: count || 0, error };
}

export async function getChosenBudgetsCount(): Promise<{ data: number; error: any }> {
	const supabase = getSupabaseClient();
	const { count, error } = await supabase
		.from(TABLE)
		.select('*', { count: 'exact', head: true })
		.eq('accepted', true);
	return { data: count || 0, error };
}

export async function getSoldBudgetsTotalAmount(): Promise<{
	data: { totalArs: number; totalUsd: number };
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select('amount_ars, amount_usd')
		.eq('sold', true);

	if (error) return { data: { totalArs: 0, totalUsd: 0 }, error };
	if (!data) return { data: { totalArs: 0, totalUsd: 0 }, error: null };

	const totalArs = data.reduce((sum, budget) => sum + (budget.amount_ars || 0), 0);
	const totalUsd = data.reduce((sum, budget) => sum + (budget.amount_usd || 0), 0);

	return { data: { totalArs, totalUsd }, error: null };
}

export async function getLostBudgetsTotalAmount(): Promise<{
	data: { totalArs: number; totalUsd: number };
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select('amount_ars, amount_usd')
		.eq('lost', true);

	if (error) return { data: { totalArs: 0, totalUsd: 0 }, error };
	if (!data) return { data: { totalArs: 0, totalUsd: 0 }, error: null };

	const totalArs = data.reduce((sum, budget) => sum + (budget.amount_ars || 0), 0);
	const totalUsd = data.reduce((sum, budget) => sum + (budget.amount_usd || 0), 0);

	return { data: { totalArs, totalUsd }, error: null };
}

export async function getChosenBudgetsTotalAmount(): Promise<{
	data: { totalArs: number; totalUsd: number };
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select('amount_ars, amount_usd')
		.eq('accepted', true);

	if (error) return { data: { totalArs: 0, totalUsd: 0 }, error };
	if (!data) return { data: { totalArs: 0, totalUsd: 0 }, error: null };

	const totalArs = data.reduce((sum, budget) => sum + (budget.amount_ars || 0), 0);
	const totalUsd = data.reduce((sum, budget) => sum + (budget.amount_usd || 0), 0);

	return { data: { totalArs, totalUsd }, error: null };
}

export async function listBudgetsForReport(): Promise<{
	data: BudgetWithWorkAndClient[] | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from('budgets')
		.select(
			`
			*,
			folder_budget:folder_budgets(
				client:clients(id, name, last_name),
				work:works(address, locality, name)
			)
		`
		)
		.order('created_at', { ascending: false });

	if (error) return { data: null, error };
	if (!data) return { data: [], error: null };

	const result: BudgetWithWorkAndClient[] = data.map((b: any) => {
		// Handle folder_budget - it can be null, array, or object
		let folderBudget = null;
		if (b.folder_budget) {
			folderBudget = Array.isArray(b.folder_budget) ? b.folder_budget[0] : b.folder_budget;
		}

		// Handle work - it can be null, array, or object
		let work = null;
		if (folderBudget?.work) {
			work = Array.isArray(folderBudget.work) ? folderBudget.work[0] : folderBudget.work;
		}

		// Handle client - it can be null, array, or object
		let client = null;
		if (folderBudget?.client) {
			client = Array.isArray(folderBudget.client) ? folderBudget.client[0] : folderBudget.client;
		}

		return {
			...b,
			amount_ars: b.amount_ars || 0,
			amount_usd: b.amount_usd || 0,
			folder_budget: folderBudget
				? {
						id: folderBudget.id,
						work_id: folderBudget.work_id,
						work: work
							? {
									address: work.address || '',
									locality: work.locality || '',
									name: work.name || '',
								}
							: {
									address: '',
									locality: '',
									name: '',
								},
					}
				: {
						id: '',
						work_id: '',
						work: {
							address: '',
							locality: '',
						},
					},
			client: client || null,
		} as BudgetWithWorkAndClient;
	});

	return { data: result, error: null };
}

const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export async function getClientsWithBudgetCount(): Promise<{ data: number; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from('folder_budgets')
		.select('client_id', { count: 'exact' });

	if (error) return { data: 0, error };
	if (!data) return { data: 0, error: null };

	// Obtain unique client IDs from the folder_budgets table and count them
	const uniqueClients = new Set(data.map((item: any) => item.client_id).filter(Boolean));
	return { data: uniqueClients.size, error: null };
}

export async function getBudgetsByMonth(): Promise<{
	data: Array<{ month: string; presupuestos: number; vendidos: number }> | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('created_at, sold, lost');

	if (error) return { data: null, error };
	if (!data) return { data: [], error: null };

	// Group by month and count presupuestos and vendidos
	const monthMap = new Map<string, { presupuestos: number; vendidos: number; perdidos: number }>();

	// Inizialize monthMap with all months to ensure they appear in the result even if they have 0 presupuestos/vendidos
	months.forEach((month) => {
		monthMap.set(month, { presupuestos: 0, vendidos: 0, perdidos: 0 });
	});

	// Contact data and populate monthMap
	data.forEach((budget: any) => {
		if (budget.created_at) {
			const date = new Date(budget.created_at);
			const monthIndex = date.getMonth();
			const monthName = months[monthIndex];

			const current = monthMap.get(monthName) || { presupuestos: 0, vendidos: 0, perdidos: 0 };
			current.presupuestos += 1;
			if (budget.sold) {
				current.vendidos += 1;
			}
			if (budget.lost) {
				current.perdidos += 1;
			}
			monthMap.set(monthName, current);
		}
	});

	// Convert monthMap to an array and ensure all months are included in the result
	const result = months.map((month) => ({
		month,
		...monthMap.get(month)!,
	}));

	return { data: result, error: null };
}

const AMOUNT_INTERVALS = [
	{ label: '0 a 1.000.000', min: 0, max: 1_000_000 },
	{ label: '1.000.000 a 10.000.000', min: 1_000_000, max: 10_000_000 },
	{ label: '10.000.000 a 30.000.000', min: 10_000_000, max: 30_000_000 },
	{ label: '30.000.000 a 50.000.000', min: 30_000_000, max: 50_000_000 },
	{ label: 'Mayor a 50.000.000', min: 50_000_000, max: Number.POSITIVE_INFINITY },
];

export async function getBudgetsByAmountRange(): Promise<{
	data: Array<{ amountRange: string; count: number }> | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('amount_ars');

	if (error) return { data: null, error };
	if (!data) return { data: [], error: null };

	const amounts = data
		.map((budget: any) => Number(budget.amount_ars || 0))
		.filter((amount: number) => Number.isFinite(amount) && amount >= 0);

	if (amounts.length === 0) {
		return {
			data: AMOUNT_INTERVALS.map((interval) => ({ amountRange: interval.label, count: 0 })),
			error: null,
		};
	}

	const intervalCounts = AMOUNT_INTERVALS.map((interval) => ({
		amountRange: interval.label,
		count: 0,
	}));

	amounts.forEach((amount) => {
		const intervalIndex = AMOUNT_INTERVALS.findIndex((interval, index) => {
			if (index === AMOUNT_INTERVALS.length - 1) {
				return amount >= interval.min;
			}

			return amount >= interval.min && amount < interval.max;
		});

		if (intervalIndex >= 0) {
			intervalCounts[intervalIndex].count += 1;
		}
	});

	return { data: intervalCounts, error: null };
}

export async function getBudgetsByAmountRangeChosen(): Promise<{
	data: Array<{ amountRange: string; count: number }> | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('amount_ars').eq('accepted', true);

	if (error) return { data: null, error };
	if (!data) return { data: [], error: null };

	const amounts = data
		.map((budget: any) => Number(budget.amount_ars || 0))
		.filter((amount: number) => Number.isFinite(amount) && amount >= 0);

	if (amounts.length === 0) {
		return {
			data: AMOUNT_INTERVALS.map((interval) => ({ amountRange: interval.label, count: 0 })),
			error: null,
		};
	}

	const intervalCounts = AMOUNT_INTERVALS.map((interval) => ({
		amountRange: interval.label,
		count: 0,
	}));

	amounts.forEach((amount) => {
		const intervalIndex = AMOUNT_INTERVALS.findIndex((interval, index) => {
			if (index === AMOUNT_INTERVALS.length - 1) {
				return amount >= interval.min;
			}

			return amount >= interval.min && amount < interval.max;
		});

		if (intervalIndex >= 0) {
			intervalCounts[intervalIndex].count += 1;
		}
	});

	return { data: intervalCounts, error: null };
}

export async function getBudgetsByAmountRangeSold(): Promise<{
	data: Array<{ amountRange: string; count: number }> | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('amount_ars').eq('sold', true);

	if (error) return { data: null, error };
	if (!data) return { data: [], error: null };

	const amounts = data
		.map((budget: any) => Number(budget.amount_ars || 0))
		.filter((amount: number) => Number.isFinite(amount) && amount >= 0);

	if (amounts.length === 0) {
		return {
			data: AMOUNT_INTERVALS.map((interval) => ({ amountRange: interval.label, count: 0 })),
			error: null,
		};
	}

	const intervalCounts = AMOUNT_INTERVALS.map((interval) => ({
		amountRange: interval.label,
		count: 0,
	}));

	amounts.forEach((amount) => {
		const intervalIndex = AMOUNT_INTERVALS.findIndex((interval, index) => {
			if (index === AMOUNT_INTERVALS.length - 1) {
				return amount >= interval.min;
			}

			return amount >= interval.min && amount < interval.max;
		});

		if (intervalIndex >= 0) {
			intervalCounts[intervalIndex].count += 1;
		}
	});

	return { data: intervalCounts, error: null };
}

export async function getBudgetsByAmountRangeLost(): Promise<{
	data: Array<{ amountRange: string; count: number }> | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('amount_ars').eq('lost', true);

	if (error) return { data: null, error };
	if (!data) return { data: [], error: null };

	const amounts = data
		.map((budget: any) => Number(budget.amount_ars || 0))
		.filter((amount: number) => Number.isFinite(amount) && amount >= 0);

	if (amounts.length === 0) {
		return {
			data: AMOUNT_INTERVALS.map((interval) => ({ amountRange: interval.label, count: 0 })),
			error: null,
		};
	}

	const intervalCounts = AMOUNT_INTERVALS.map((interval) => ({
		amountRange: interval.label,
		count: 0,
	}));

	amounts.forEach((amount) => {
		const intervalIndex = AMOUNT_INTERVALS.findIndex((interval, index) => {
			if (index === AMOUNT_INTERVALS.length - 1) {
				return amount >= interval.min;
			}

			return amount >= interval.min && amount < interval.max;
		});

		if (intervalIndex >= 0) {
			intervalCounts[intervalIndex].count += 1;
		}
	});

	return { data: intervalCounts, error: null };
}

export async function getBudgetsByLocation(): Promise<{
	data: Array<{ location: string; count: number }> | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from('folder_budgets').select('works!inner(locality)');

	if (error) return { data: null, error };
	if (!data) return { data: [], error: null };

	// Group by location
	const locationMap = new Map<string, number>();

	data.forEach((item: any) => {
		if (item.works && item.works.locality) {
			const locality = item.works.locality;
			locationMap.set(locality, (locationMap.get(locality) || 0) + 1);
		}
	});

	// Convert to array and sort by count descending
	const result = Array.from(locationMap, ([location, count]) => ({
		location,
		count,
	})).sort((a, b) => b.count - a.count);

	return { data: result, error: null };
}

export async function getClientsByContactMethod(): Promise<{
	data: Array<{ method: string; count: number }> | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from('clients').select('contact_method');

	if (error) return { data: null, error };
	if (!data) return { data: [], error: null };

	// Group by contact method
	const methodMap = new Map<string, number>();

	data.forEach((item: any) => {
		const method = item.contact_method || 'WHATSAPP';
		methodMap.set(method, (methodMap.get(method) || 0) + 1);
	});

	// Convert to array and sort by count descending
	const result = Array.from(methodMap, ([method, count]) => ({
		method,
		count,
	})).sort((a, b) => b.count - a.count);

	return { data: result, error: null };
}

export async function getBudgetsByMaterial(): Promise<{
	data: Array<{ material: string; count: number }> | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('type');

	if (error) return { data: null, error };
	if (!data) return { data: [], error: null };

	// Group by material type
	const materialMap = new Map<string, number>();

	data.forEach((item: any) => {
		const material = item.type || 'Sin especificar';
		materialMap.set(material, (materialMap.get(material) || 0) + 1);
	});

	// Convert to array and sort by count descending
	const result = Array.from(materialMap, ([material, count]) => ({
		material,
		count,
	})).sort((a, b) => b.count - a.count);

	return { data: result, error: null };
}

export async function getSoldBudgetsByMaterial(): Promise<{
	data: Array<{ material: string; count: number }> | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('type').eq('sold', true);

	if (error) return { data: null, error };
	if (!data) return { data: [], error: null };

	// Group by material type
	const materialMap = new Map<string, number>();

	data.forEach((item: any) => {
		const material = item.type || 'Sin especificar';
		materialMap.set(material, (materialMap.get(material) || 0) + 1);
	});

	// Convert to array and sort by count descending
	const result = Array.from(materialMap, ([material, count]) => ({
		material,
		count,
	})).sort((a, b) => b.count - a.count);

	return { data: result, error: null };
}

export async function getSoldBudgetsByMaterialByMonth(): Promise<{
	data: Array<{ month: string; pvc: number; aluminio: number }> | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('created_at, type').eq('sold', true);

	if (error) return { data: null, error };
	if (!data) return { data: [], error: null };

	const monthMap = new Map<string, { pvc: number; aluminio: number }>();

	months.forEach((month) => {
		monthMap.set(month, { pvc: 0, aluminio: 0 });
	});

	data.forEach((budget: any) => {
		if (!budget.created_at) return;

		const monthName = months[new Date(budget.created_at).getMonth()];
		const current = monthMap.get(monthName) || { pvc: 0, aluminio: 0 };
		const material = String(budget.type || '')
			.trim()
			.toLowerCase();

		if (material.includes('pvc')) {
			current.pvc += 1;
		}

		if (material.includes('aluminio')) {
			current.aluminio += 1;
		}

		monthMap.set(monthName, current);
	});

	const result = months.map((month) => ({
		month,
		...monthMap.get(month)!,
	}));

	return { data: result, error: null };
}

export async function chooseBudgetForClient(
	budgetId: number,
	folderBudgetIds: number[]
): Promise<{ error: any }> {
	const supabase = getSupabaseClient();
	if (folderBudgetIds.length === 0) return { error: null };

	const { error: clearError } = await supabase
		.from(TABLE)
		.update({ accepted: false })
		.in('folder_budget_id', folderBudgetIds);

	if (clearError) return { error: clearError };

	const { error: setError } = await supabase
		.from(TABLE)
		.update({ accepted: true })
		.eq('id', budgetId);

	if (setError) return { error: setError };
	return { error: null };
}
