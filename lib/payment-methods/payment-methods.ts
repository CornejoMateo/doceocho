import { getSupabaseClient } from '../supabase-client';

export type PaymentMethod = {
	id: number;
	created_at: string;
	name: string;
	is_active: boolean;
};

export type PaymentMethodInput = Omit<PaymentMethod, 'id' | 'created_at'>;

const TABLE = 'payment_methods';

export async function listPaymentMethods(): Promise<{
	data: PaymentMethod[] | null;
	error: any;
}> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('*').order('name', { ascending: true });
	return { data, error };
}

export async function createPaymentMethod(
	paymentMethod: PaymentMethodInput
): Promise<{ data: PaymentMethod | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).insert(paymentMethod).select().single();
	return { data, error };
}

export async function updatePaymentMethod(
	id: number,
	updates: Partial<PaymentMethodInput>
): Promise<{ data: PaymentMethod | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single();
	return { data, error };
}

export async function deletePaymentMethod(id: number): Promise<{ error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select('id');
	if (error) return { error };
	if (!data || data.length === 0) {
		return {
			error: { message: 'No se pudo eliminar el método de pago (no existe o no tenés permisos)' },
		};
	}
	return { error: null };
}
