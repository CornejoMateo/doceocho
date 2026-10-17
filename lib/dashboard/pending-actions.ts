import { getSupabaseClient } from '@/lib/supabase-client';

export type PendingActions = {
	/** Clients waiting for their appointment to be accepted or rejected. */
	appointments: number;
	/** Employees waiting for a vacation request to be resolved. */
	vacations: number;
	/** Budgets sent to sign that the client has not signed yet. */
	signatures: number;
};

const EMPTY_PENDING_ACTIONS: PendingActions = {
	appointments: 0,
	vacations: 0,
	signatures: 0,
};

/** Counts rows without transferring them: only the number is needed. */
async function countPending(table: string): Promise<number> {
	const supabase = getSupabaseClient();

	const { count, error } = await supabase
		.from(table)
		.select('*', { count: 'exact', head: true })
		.eq('status', 'Pendiente');

	if (error) throw error;

	return count ?? 0;
}

/**
 * Everything waiting for an admin to decide something.
 * Each count is fetched on its own so one module being unavailable leaves the
 * rest of the panel working instead of blanking it.
 */
export async function getPendingActions(): Promise<PendingActions> {
	const [appointments, vacations, signatures] = await Promise.allSettled([
		countPending('appointments'),
		countPending('vacation_requests'),
		countPending('budget_signatures'),
	]);

	const readCount = (result: PromiseSettledResult<number>, label: string): number => {
		if (result.status === 'fulfilled') return result.value;

		console.error('[dashboard] Could not count pending %s:', label, result.reason);
		return 0;
	};

	return {
		appointments: readCount(appointments, 'appointments'),
		vacations: readCount(vacations, 'vacation requests'),
		signatures: readCount(signatures, 'budget signatures'),
	};
}

export { EMPTY_PENDING_ACTIONS };
