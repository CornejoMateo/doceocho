'use server';

import { getServerSupabaseClient } from '@/lib/get-server-supabase-client';

type Event = {
	id: number;
	created_at?: string;
	date: string;
	time?: string | null;
	type?: string | null;
	title?: string | null;
	description?: string | null;
	client_id?: number | null;
	client_name?: string | null;
	status?: string | null;
	is_overdue?: boolean;
	remember?: boolean;
	type_id: number | null;
	work_id?: number | null;
	work_location?: string | null;
};

const TABLE = 'events';

export async function createEventServer(
	event: Omit<Event, 'id' | 'created_at'>
): Promise<{ data: Event | null; error: any }> {
	const supabase = await getServerSupabaseClient();

	try {
		const payload: any = {
			title: event.title,
			type_id: event.type_id,
			description: event.description,
			client_id: event.client_id,
			client_name: event.client_id ? null : event.client_name,
			date: event.date,
			time: event.time || null,
			status: 'pending',
			is_overdue: false,
			remember: event.remember,
			work_id: event.work_id,
			work_location: event.work_location,
			created_at: new Date().toISOString(),
		};

		const { data, error } = await supabase.from(TABLE).insert(payload).select().single();

		if (error) {
			console.error('Error al crear el evento:', error);
			return { data: null, error };
		}

		return { data: data as Event, error: null };
	} catch (error) {
		console.error('Error inesperado al crear el evento:', error);
		return { data: null, error };
	}
}
