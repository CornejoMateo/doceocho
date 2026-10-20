import type { SupabaseClient } from '@supabase/supabase-js';
import { budgetFromRow } from '@/lib/budget-builder/budget-builder';
import { DEFAULT_SETTINGS } from '@/constants/budget-builder/budget-builder';
import type { Budget, CompanyInfo } from '@/lib/budget-builder/types';

/** Server only. The budget behind a client link plus the company data shown with it. */
export async function loadPublicBudget(
	supabase: SupabaseClient,
	token: string
): Promise<{ budget: Budget; company: CompanyInfo } | null> {
	const [{ data: row }, { data: settings }] = await Promise.all([
		supabase.from('budget_builder_budgets').select('*').eq('public_token', token).maybeSingle(),
		supabase.from('budget_builder_settings').select('company').eq('id', 1).maybeSingle(),
	]);

	if (!row) return null;

	return {
		budget: budgetFromRow(row),
		company: { ...DEFAULT_SETTINGS.company, ...(settings?.company as CompanyInfo) },
	};
}
