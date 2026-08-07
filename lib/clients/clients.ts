import { getSupabaseClient } from '../supabase-client';
import type { SupabaseClient } from '@supabase/supabase-js';

export type Client = {
	id: number;
	created_at?: string;
	name?: string | null;
	last_name?: string | null;
	phone_number?: string | null;
	locality?: string | null;
	email?: string | null;
	cover?: string | null;
	contact_method?: string | null;
	referred_to?: string | null;
	identity_number?: string | null;
};

const TABLE = 'clients';

export async function getClientsCount(): Promise<{ data: number; error: any }> {
	const supabase = getSupabaseClient();
	const { count, error } = await supabase.from(TABLE).select('*', { count: 'exact', head: true });
	return { data: count || 0, error };
}

export async function listClients(): Promise<{ data: Client[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select(
			'name, last_name, id, phone_number, locality, email, contact_method, referred_to, identity_number'
		)
		.order('created_at', { ascending: false });
	return { data, error };
}

export async function getClientById(id: number): Promise<{ data: Client | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
	return { data, error };
}

export async function createClient(
	client: Omit<Client, 'id' | 'created_at'>,
	supabaseClient?: SupabaseClient
): Promise<{ data: Client | null; error: any }> {
	const supabase = supabaseClient ?? getSupabaseClient();
	const payload = {
		...client,
		created_at: new Date().toISOString(),
	};
	const { data, error } = await supabase.from(TABLE).insert(payload).select().single();
	return { data, error };
}

export async function updateClient(
	id: number,
	changes: Partial<Client>
): Promise<{ data: Client | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).update(changes).eq('id', id).select().single();
	return { data, error };
}

export async function deleteClient(id: number): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();

	// First, delete all files in the client's folder
	try {
		const { data: files, error: listError } = await supabase.storage
			.from('clients')
			.list(String(id));

		if (!listError && files && files.length > 0) {
			const filePaths = files.map((file) => `${String(id)}/${file.name}`);
			await supabase.storage.from('clients').remove(filePaths);
		}
	} catch (err) {
		console.error('Error deleting client folder:', err);
	}

	// Then delete the client record
	const { error } = await supabase.from(TABLE).delete().eq('id', id);
	return { data: null, error };
}

export async function createClientFolder(clientId: number, supabaseClient?: SupabaseClient) {
	const supabase = supabaseClient ?? getSupabaseClient();

	const filePath = `${String(clientId)}/.keep.txt`;

	const blob = new Blob(['Cliente creado correctamente'], {
		type: 'text/plain',
	});

	try {
		const { data, error } = await supabase.storage.from('clients').upload(filePath, blob);

		if (error) {
			console.error('Storage upload error:', error);
		}

		return { data, error };
	} catch (err) {
		return { data: null, error: err };
	}
}

export async function getClientsThisWeek(): Promise<{ data: Client[] | null; error: any }> {
	const supabase = getSupabaseClient();

	const now = new Date();
	const startOfWeek = new Date(now);
	startOfWeek.setDate(now.getDate() - now.getDay());
	startOfWeek.setHours(0, 0, 0, 0);

	const { data, error } = await supabase
		.from(TABLE)
		.select(
			'name, last_name, id, phone_number, locality, email, contact_method, referred_to, identity_number, created_at'
		)
		.gte('created_at', startOfWeek.toISOString())
		.order('created_at', { ascending: false });

	return { data, error };
}
