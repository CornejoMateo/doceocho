import { getSupabaseClient } from '../supabase-client';
import { fromZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Argentina/Buenos_Aires';

export interface ModulesMonthlySettlement {
	id: number;
	created_at: string;
	year: number;
	month: number;
	user_id: string;
	amount: number;
	modules_count: number;
}

export interface ModulesMonthlySettlementWithUser extends ModulesMonthlySettlement {
	user_name: string;
}

export interface ModulesMonthlySettlementInput {
	year: number;
	month: number;
	user_id: string;
	amount: number;
	modules_count: number;
}

/**
 * Get a single modules monthly settlement by user, year and month
 */

export async function getModulesMonthlySettlement(
	userId: string,
	year: number,
	month: number
): Promise<{ data: ModulesMonthlySettlement | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('modules_monthly_settlements')
		.select('*')
		.eq('user_id', userId)
		.eq('year', year)
		.eq('month', month)
		.maybeSingle();

	return { data, error };
}

/**
 * Get all modules monthly settlements of a user
 */

export async function getModulesMonthlySettlementsByUser(
	userId: string
): Promise<{ data: ModulesMonthlySettlement[] | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('modules_monthly_settlements')
		.select('*')
		.eq('user_id', userId)
		.order('year', { ascending: false })
		.order('month', { ascending: false });

	return { data, error };
}

/**
 * Get all modules monthly settlements of a specific month (with user names)
 */

export async function getModulesMonthlySettlementsByMonth(
	year: number,
	month: number
): Promise<{ data: ModulesMonthlySettlementWithUser[] | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('modules_monthly_settlements')
		.select(
			`
			*,
			users (
				name,
				last_name,
				username
			)
		`
		)
		.eq('year', year)
		.eq('month', month)
		.order('created_at', { ascending: false });

	if (error) {
		return { data: null, error };
	}

	const settlements = data?.map((settlement: any) => ({
		...settlement,
		user_name:
			settlement.users?.username ||
			`${settlement.users?.name || ''} ${settlement.users?.last_name || ''}`.trim() ||
			'Desconocido',
	})) as ModulesMonthlySettlementWithUser[];

	return { data: settlements || null, error: null };
}

/**
 * Create a new modules monthly settlement
 */

export async function createModulesMonthlySettlement(
	input: ModulesMonthlySettlementInput
): Promise<{ data: ModulesMonthlySettlement | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('modules_monthly_settlements')
		.insert(input)
		.select()
		.single();

	return { data, error };
}

/**
 * Update a modules monthly settlement
 */
export async function updateModulesMonthlySettlement(
	id: number,
	updates: Partial<ModulesMonthlySettlementInput>
): Promise<{ data: ModulesMonthlySettlement | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('modules_monthly_settlements')
		.update(updates)
		.eq('id', id)
		.select()
		.single();

	return { data, error };
}

/**
 * Delete a modules monthly settlement
 */

export async function deleteModulesMonthlySettlement(
	id: number
): Promise<{ data: ModulesMonthlySettlement | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('modules_monthly_settlements')
		.delete()
		.eq('id', id)
		.select()
		.single();

	return { data, error };
}

/**
 * Upsert a modules monthly settlement (create or update)
 */

export async function upsertModulesMonthlySettlement(
	input: ModulesMonthlySettlementInput
): Promise<{ data: ModulesMonthlySettlement | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('modules_monthly_settlements')
		.upsert(input, {
			onConflict: 'user_id,year,month',
		})
		.select()
		.single();

	return { data, error };
}

export interface UserModulesAmount {
	[key: string]: { amount: number; count: number; name: string };
}

// Compute the total approved modules amount per user for a given year/month
export async function getApprovedModulesAmountsForMonth(
	year: number,
	month: number
): Promise<{ data: UserModulesAmount | null; error: any }> {
	const supabase = getSupabaseClient();

	const monthOneBased = month + 1;

	const startOfMonth = fromZonedTime(
		`${year}-${String(monthOneBased).padStart(2, '0')}-01T00:00:00`,
		TIMEZONE
	).toISOString();

	const lastDay = new Date(year, monthOneBased, 0).getDate();

	const endOfMonth = fromZonedTime(
		`${year}-${String(monthOneBased).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999`,
		TIMEZONE
	).toISOString();

	const { data, error } = await supabase
		.from('modules')
		.select(
			`
			user_id,
			amount,
			users (
				name,
				last_name,
				username
			)
		`
		)
		.eq('status', 'approved')
		.gte('created_at', startOfMonth)
		.lte('created_at', endOfMonth);

	if (error) {
		return { data: null, error };
	}

	const userAmounts: UserModulesAmount = {};

	(data || []).forEach((module: any) => {
		if (!module.user_id) return;

		const userName =
			module.users?.username ||
			`${module.users?.name || ''} ${module.users?.last_name || ''}`.trim() ||
			'Desconocido';

		if (!userAmounts[module.user_id]) {
			userAmounts[module.user_id] = { amount: 0, count: 0, name: userName };
		}

		userAmounts[module.user_id].amount += Number(module.amount) || 0;
		userAmounts[module.user_id].count += 1;
	});

	return { data: userAmounts, error: null };
}
