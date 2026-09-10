import { getSupabaseClient } from '@/lib/supabase-client';
import type { VacationStatus } from '@/constants/human-resources/vacations';

const TABLE = 'vacation_requests';

export type VacationRequest = {
	id: number;
	created_at: string;
	updated_at: string;
	user_id: string;
	start_date: string;
	end_date: string;
	reason: string | null;
	status: VacationStatus;
	reviewer_notes: string | null;
	reviewed_by: string | null;
	reviewed_at: string | null;
};

export type VacationRequestInput = {
	start_date: string;
	end_date: string;
	reason?: string | null;
};

/** RLS decides the scope: an admin gets every request, anyone else only their own. */
export async function listVacationRequests(): Promise<{
	data: VacationRequest[] | null;
	error: any;
}> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.order('start_date', { ascending: false });

	if (error) {
		return { data: null, error };
	}

	return { data: data ?? [], error: null };
}

export async function createVacationRequest(
	userId: string,
	input: VacationRequestInput
): Promise<{ data: VacationRequest | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(TABLE)
		.insert({
			user_id: userId,
			start_date: input.start_date,
			end_date: input.end_date,
			reason: input.reason || null,
			status: 'Pendiente',
		})
		.select()
		.single();

	if (error) {
		return { data: null, error };
	}

	return { data, error: null };
}

export async function resolveVacationRequest(
	requestId: number,
	status: Extract<VacationStatus, 'Aprobada' | 'Rechazada'>,
	reviewerId: string,
	reviewerNotes?: string | null
): Promise<{ data: VacationRequest | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(TABLE)
		.update({
			status,
			reviewer_notes: reviewerNotes || null,
			reviewed_by: reviewerId,
			reviewed_at: new Date().toISOString(),
		})
		.eq('id', requestId)
		.select()
		.single();

	if (error) {
		return { data: null, error };
	}

	return { data, error: null };
}

export async function deleteVacationRequest(requestId: number): Promise<{ error: any }> {
	const supabase = getSupabaseClient();

	const { error } = await supabase.from(TABLE).delete().eq('id', requestId);

	return { error };
}
