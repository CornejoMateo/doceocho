import { getSupabaseClient } from '../supabase-client';

export interface MonthlySettlement {
	id: number;
	created_at: string;
	year: number;
	month: number;
	user_id: string;
	amount: number;
	number_hours: number;
	number_overtime_hours: number;
	price_hour: number;
	price_overtime_hour: number;
}

export interface MonthlySettlementWithUser extends MonthlySettlement {
	user_name: string;
}

export interface MonthlySettlementInput {
	year: number;
	month: number;
	user_id: string;
	amount: number;
	number_hours: number;
	number_overtime_hours: number;
	price_hour: number;
	price_overtime_hour: number;
}

/**
 * Get a single monthly settlement by user, year and month
 */

export async function getMonthlySettlement(
	userId: string,
	year: number,
	month: number
): Promise<{ data: MonthlySettlement | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('monthly_settlements')
		.select('*')
		.eq('user_id', userId)
		.eq('year', year)
		.eq('month', month)
		.maybeSingle();

	return { data, error };
}

/**
 * Get all monthly settlements of a user
 * We're going to use this method for the “Payments” button
 */

export async function getMonthlySettlementsByUser(
	userId: string
): Promise<{ data: MonthlySettlement[] | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('monthly_settlements')
		.select('*')
		.eq('user_id', userId)
		.order('year', { ascending: false })
		.order('month', { ascending: false });

	return { data, error };
}

export async function getAllMonthlySettlements(): Promise<{
	data: MonthlySettlementWithUser[] | null;
	error: any;
}> {
	const supabase = getSupabaseClient();

	const now = new Date();

	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth() + 1;

	const previousDate = new Date(currentYear, currentMonth - 2, 1);
	const previousYear = previousDate.getFullYear();
	const previousMonth = previousDate.getMonth() + 1;

	const { data, error } = await supabase
		.from('monthly_settlements')
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
		.or(
			`and(year.eq.${currentYear},month.eq.${currentMonth}),and(year.eq.${previousYear},month.eq.${previousMonth})`
		)
		.order('year', { ascending: false })
		.order('month', { ascending: false });

	if (error) {
		return { data: null, error };
	}

	const settlements = data?.map((settlement: any) => ({
		...settlement,
		user_name:
			settlement.users?.username ||
			`${settlement.users?.name || ''} ${settlement.users?.last_name || ''}`.trim() ||
			'Desconocido',
	})) as MonthlySettlementWithUser[];

	return {
		data: settlements || null,
		error: null,
	};
}

/**
 * Get all monthly settlements of a specific month (with user names)
 */

export async function getMonthlySettlementsByMonth(
	year: number,
	month: number
): Promise<{ data: MonthlySettlementWithUser[] | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('monthly_settlements')
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
	})) as MonthlySettlementWithUser[];

	return { data: settlements || null, error: null };
}

/**
 * Create a new monthly settlement
 */

export async function createMonthlySettlement(
	input: MonthlySettlementInput
): Promise<{ data: MonthlySettlement | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('monthly_settlements')
		.insert(input)
		.select()
		.single();

	return { data, error };
}

/**
 * Update a monthly settlement
 */
export async function updateMonthlySettlement(
	id: number,
	updates: Partial<MonthlySettlementInput>
): Promise<{ data: MonthlySettlement | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('monthly_settlements')
		.update(updates)
		.eq('id', id)
		.select()
		.single();

	return { data, error };
}

/**
 * Delete a monthly settlement
 */

export async function deleteMonthlySettlement(
	id: number
): Promise<{ data: MonthlySettlement | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('monthly_settlements')
		.delete()
		.eq('id', id)
		.select()
		.single();

	return { data, error };
}

/**
 * Upsert a monthly settlement (create or update)
 */

export async function upsertMonthlySettlement(
	input: MonthlySettlementInput
): Promise<{ data: MonthlySettlement | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from('monthly_settlements')
		.upsert(input, {
			onConflict: 'user_id,year,month',
		})
		.select()
		.single();

	return { data, error };
}
