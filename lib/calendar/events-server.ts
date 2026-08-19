'use server';

import { google } from 'googleapis';
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

// Función auxiliar para sincronizar con Google Calendar
async function syncWithGoogleCalendar(eventData: Omit<Event, 'id' | 'created_at'>) {
	try {
		const oauth2Client = new google.auth.OAuth2(
			process.env.GOOGLE_CLIENT_ID,
			process.env.GOOGLE_CLIENT_SECRET,
			process.env.GOOGLE_REDIRECT_URI
		);

		oauth2Client.setCredentials({
			refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
		});

		const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

		// Combinamos fecha y hora (ejemplo: "2026-08-20" y "10:00")
		// Si no hay hora, podemos crear un evento de todo el día o poner una hora por defecto
		const startDateTime = eventData.time
			? `${eventData.date}T${eventData.time}:00`
			: `${eventData.date}T09:00:00`; // Hora por defecto si no especifica

		// Asumimos una duración por defecto de 1 hora si no tiene hora de fin
		const endDateTime = eventData.time
			? `${eventData.date}T${String(parseInt(eventData.time.split(':')[0]) + 1).padStart(2, '0')}:${eventData.time.split(':')[1]}:00`
			: `${eventData.date}T10:00:00`;

		const googleEvent = {
			summary: eventData.title,
			description:
				eventData.description ||
				`Cliente: ${eventData.client_name || 'N/A'} - Ubicación: ${eventData.work_location || 'N/A'}`,
			start: {
				dateTime: startDateTime,
				timeZone: 'America/Argentina/Cordoba', // Ajusta a tu zona horaria local
			},
			end: {
				dateTime: endDateTime,
				timeZone: 'America/Argentina/Cordoba',
			},
		};

		await calendar.events.insert({
			calendarId: 'primary',
			requestBody: googleEvent,
		});

		console.log('Evento sincronizado con Google Calendar exitosamente');
	} catch (error) {
		console.error('Error al sincronizar con Google Calendar (no afecta a Supabase):', error);
	}
}

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

		// Sincronizamos con Google Calendar en segundo plano
		// (Lo ejecutamos pero no frenamos la respuesta si falla el calendario)
		await syncWithGoogleCalendar(payload);

		return { data: data as Event, error: null };
	} catch (error) {
		console.error('Error inesperado al crear el evento:', error);
		return { data: null, error };
	}
}
