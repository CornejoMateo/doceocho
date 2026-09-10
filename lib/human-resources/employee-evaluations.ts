import { getSupabaseClient } from '@/lib/supabase-client';

const TABLE = 'employee_evaluations';

export type EmployeeEvaluation = {
	id: number;
	created_at: string;
	updated_at: string;
	employee_id: number;
	year: number;
	/** 0 = enero ... 11 = diciembre, same convention as monthly_settlements. */
	month: number;
	rating: number;
	notes: string | null;
	evaluated_by: string | null;
};

export type EmployeeEvaluationInput = {
	employee_id: number;
	year: number;
	month: number;
	rating: number;
	notes?: string | null;
	evaluated_by?: string | null;
};

export async function listEmployeeEvaluations(): Promise<{
	data: EmployeeEvaluation[] | null;
	error: any;
}> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.order('year', { ascending: false })
		.order('month', { ascending: false });

	if (error) {
		return { data: null, error };
	}

	return { data: data ?? [], error: null };
}

// One evaluation per employee and period, so saving twice updates the existing row.
export async function upsertEmployeeEvaluation(
	input: EmployeeEvaluationInput
): Promise<{ data: EmployeeEvaluation | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(TABLE)
		.upsert(
			{
				employee_id: input.employee_id,
				year: input.year,
				month: input.month,
				rating: input.rating,
				notes: input.notes ?? null,
				evaluated_by: input.evaluated_by ?? null,
			},
			{ onConflict: 'employee_id,year,month' }
		)
		.select()
		.single();

	if (error) {
		return { data: null, error };
	}

	return { data, error: null };
}

export async function deleteEmployeeEvaluation(evaluationId: number): Promise<{ error: any }> {
	const supabase = getSupabaseClient();

	const { error } = await supabase.from(TABLE).delete().eq('id', evaluationId);

	return { error };
}
