import { getSupabaseClient } from '../supabase-client';

export type Supplier = {
	id: number;
	created_at: string;
	name: string;
	business_name: string | null;
	tax_id: string | null;
	whatsapp: string | null;
	email: string | null;
	category: string | null;
	locality: string | null;
	address: string | null;
	payment_terms_days: number | null;
	notes: string | null;
	is_active: boolean;
};

export type SupplierInput = Omit<Supplier, 'id' | 'created_at'>;

const TABLE = 'suppliers';

export async function listSuppliers(): Promise<{ data: Supplier[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('*').order('name', { ascending: true });
	return { data, error };
}

export async function createSupplier(
	supplier: SupplierInput
): Promise<{ data: Supplier | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).insert(supplier).select().single();
	return { data, error };
}

export async function updateSupplier(
	id: number,
	updates: Partial<SupplierInput>
): Promise<{ data: Supplier | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single();
	return { data, error };
}

export async function deleteSupplier(id: number): Promise<{ error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select('id');
	if (error) return { error };
	if (!data || data.length === 0) {
		return {
			error: { message: 'No se pudo eliminar el proveedor (no existe o no tenés permisos)' },
		};
	}
	return { error: null };
}
