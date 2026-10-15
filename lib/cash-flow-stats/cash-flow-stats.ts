import { getSupabaseClient } from '../supabase-client';
import { normalizeMoney } from '../../utils/formats-money';

// One row per bank account / payment method; groupId null = "Sin cuenta"/"Sin medio".
export type MovementTotal = {
	groupId: number | null;
	totalIn: number;
	totalOut: number;
};

type MovementTotalRow = {
	group_id: number | string | null;
	total_in: number | string;
	total_out: number | string;
};

function mapMovementTotalRow(row: MovementTotalRow): MovementTotal {
	return {
		groupId: row.group_id === null ? null : Number(row.group_id),
		totalIn: normalizeMoney(Number(row.total_in)),
		totalOut: normalizeMoney(Number(row.total_out)),
	};
}

export type MovementGroupBy = 'bank_account' | 'payment_method';

export async function getMovementTotals(
	groupBy: MovementGroupBy,
	start: string | null,
	end: string | null
): Promise<{ data: MovementTotal[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.rpc('cash_flow_movement_totals', {
		p_group_by: groupBy,
		p_start: start,
		p_end: end,
	});

	if (error) {
		return { data: null, error };
	}

	return {
		data: ((data ?? []) as MovementTotalRow[]).map(mapMovementTotalRow),
		error: null,
	};
}
