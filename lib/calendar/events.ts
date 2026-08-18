import { getSupabaseClient } from '../supabase-client';

export type Event = {
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

// It's a method that shouldn't be used, but I'm adding it just in case.
export async function listEvents(): Promise<{ data: Event[] | null; error: any }> {
	const supabase = getSupabaseClient();
	try {
		const { data, error } = await supabase
			.from(TABLE)
			.select(
				`
				*,
				clients:client_id (name, last_name)
			`
			)
			.order('created_at', { ascending: true });

		if (error) {
			console.error('Error al cargar eventos:', error);
			return { data: null, error };
		}

		const eventsWithClientName = (data ?? []).map((event: any) => ({
			...event,
			client_name: event.clients
				? [event.clients.last_name, event.clients.name].filter(Boolean).join(' ')
				: event.client_name,
		}));

		return { data: eventsWithClientName, error: null };
	} catch (error) {
		console.error('Error inesperado al listar eventos:', error);
		return {
			data: null,
			error: error instanceof Error ? error : new Error('Error desconocido al listar eventos'),
		};
	}
}

export async function getEventById(id: number): Promise<{ data: Event | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
	return { data, error };
}

export async function createEvent(
	event: Omit<Event, 'id' | 'created_at'>
): Promise<{ data: Event | null; error: any }> {
	const supabase = getSupabaseClient();

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

export async function updateEvent(
	id: number,
	changes: Partial<Event>
): Promise<{ data: Event | null; error: any }> {
	const supabase = getSupabaseClient();

	let updatePayload = { ...changes };

	if (Object.prototype.hasOwnProperty.call(changes, 'status')) {
		if (changes.status) {
			if (changes.status !== 'pending') {
				updatePayload.is_overdue = false;
			} else {
				const currentDate = new Date();
				let eventDate: Date;
				const { data: currentEvent, error: fetchError } = await supabase
					.from(TABLE)
					.select('date')
					.eq('id', id)
					.single();
				if (fetchError || !currentEvent?.date) {
					eventDate = currentDate;
				} else {
					eventDate = new Date(currentEvent.date);
				}
				updatePayload.is_overdue = eventDate < currentDate;
			}
		}
	}

	const { data, error } = await supabase
		.from(TABLE)
		.update(updatePayload)
		.eq('id', id)
		.select()
		.single();

	return { data, error };
}

export async function deleteEvent(id: number): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select('id');

	if (!error && (!data || data.length === 0)) {
		return { data: null, error: new Error('No tienes permiso para eliminar este evento.') };
	}

	return { data: null, error };
}

export async function deleteLastYearEvents(): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();

	const date = new Date();
	const year = date.getFullYear();

	const { error } = await supabase
		.from(TABLE)
		.delete()
		.eq('status', 'completed')
		.lt('date', `${year}-01-01`);

	return { data: null, error };
}
