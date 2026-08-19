import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSupabaseClient } from '@/lib/get-server-supabase-client';

const TABLE = 'events';

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const supabase = await getServerSupabaseClient();

		const payload: any = {
			title: body.title,
			type_id: body.type_id,
			description: body.description,
			client_id: body.client_id,
			client_name: body.client_id ? null : body.client_name,
			date: body.date,
			time: body.time || null,
			status: 'pending',
			is_overdue: false,
			remember: body.remember,
			work_id: body.work_id,
			work_location: body.work_location,
			created_at: new Date().toISOString(),
		};

		// 1. Guardar en Supabase
		const { data, error } = await supabase.from(TABLE).insert(payload).select().single();

		if (error) {
			console.error('Error al crear el evento en Supabase:', error);
			return NextResponse.json({ data: null, error: error.message }, { status: 400 });
		}

		// 2. Sincronizar con Google Calendar de forma segura en el servidor
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

			const startDateTime = payload.time
				? `${payload.date}T${payload.time}:00`
				: `${payload.date}T09:00:00`;

			const endDateTime = payload.time
				? `${payload.date}T${String(parseInt(payload.time.split(':')[0]) + 1).padStart(2, '0')}:${payload.time.split(':')[1]}:00`
				: `${payload.date}T10:00:00`;

			const googleEvent = {
				summary: payload.title,
				description:
					payload.description ||
					`Cliente: ${payload.client_name || 'N/A'} - Ubicación: ${payload.work_location || 'N/A'}`,
				start: {
					dateTime: startDateTime,
					timeZone: 'America/Argentina/Cordoba',
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
		} catch (calError) {
			console.error(
				'Error al sincronizar con Google Calendar (el evento ya está en Supabase):',
				calError
			);
		}

		return NextResponse.json({ data, error: null }, { status: 201 });
	} catch (err: any) {
		console.error('Error inesperado en la API de eventos:', err);
		return NextResponse.json(
			{ data: null, error: err.message || 'Error interno del servidor' },
			{ status: 500 }
		);
	}
}
