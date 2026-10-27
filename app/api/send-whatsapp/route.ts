import { NextResponse } from 'next/server';
import { authorize } from '@/helpers/users/require-permission';
import { API_PERMISSIONS } from '@/constants/permissions/views';

interface WhatsAppRequest {
	clientId: string;
	workId: string;
	phoneNumber: string;
	message: string;
	scheduledDate?: string;
	scheduledTime?: string;
}

export async function POST(req: Request) {
	try {
		const auth = await authorize(req, API_PERMISSIONS.notifyClient);
		if ('response' in auth) return auth.response;
		const { supabase } = auth;
		const body: WhatsAppRequest = await req.json();

		const { clientId, workId, phoneNumber, message, scheduledDate, scheduledTime } = body;

		// Validate required fields
		if (!phoneNumber || !message) {
			return NextResponse.json(
				{ error: 'Faltan campos requeridos: número de teléfono, mensaje' },
				{ status: 400 }
			);
		}

		// Clean and format phone number
		const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');

		// Ensure it has country code for Argentina (add 54 if missing)
		let formattedPhoneNumber = cleanPhoneNumber;
		if (cleanPhoneNumber.length === 10) {
			// Assume it's an Argentine number without country code
			formattedPhoneNumber = `54${cleanPhoneNumber}`;
		} else if (cleanPhoneNumber.length === 12 && cleanPhoneNumber.startsWith('54')) {
			// Already has country code
			formattedPhoneNumber = cleanPhoneNumber;
		} else if (cleanPhoneNumber.length === 13 && cleanPhoneNumber.startsWith('549')) {
			// Already has country code with 9 prefix
			formattedPhoneNumber = cleanPhoneNumber;
		}

		// Client and work information for the message

		const [clientResult, workResult] = await Promise.all([
			supabase.from('clients').select('name, last_name').eq('id', clientId).single(),
			supabase.from('works').select('locality, address').eq('id', workId).single(),
		]);

		const clientName = clientResult.data
			? `${clientResult.data.name || ''} ${clientResult.data.last_name || ''}`.trim()
			: 'Cliente desconocido';
		const workLocation = workResult.data
			? `${workResult.data.locality || ''}${workResult.data.address ? `, ${workResult.data.address}` : ''}`
			: 'Ubicación desconocida';

		// Create WhatsApp URL
		const encodedMessage = encodeURIComponent(message);
		const whatsappUrl = `https://wa.me/${formattedPhoneNumber}?text=${encodedMessage}`;

		// Log the WhatsApp message in the database
		try {
			await supabase.from('whatsapp_logs').insert({
				client_id: clientId,
				work_id: workId,
				phone_number: formattedPhoneNumber,
				message: message,
				scheduled_date: scheduledDate || null,
				scheduled_time: scheduledTime || null,
				sent_at: new Date().toISOString(),
				status: 'url_generated',
				whatsapp_url: whatsappUrl,
			});
		} catch (logError) {
			console.error('Error logging WhatsApp message:', logError);
			// Don't fail the request if logging fails
		}

		return NextResponse.json({
			success: true,
			message: 'URL de WhatsApp generada exitosamente',
			data: {
				phoneNumber: formattedPhoneNumber,
				message: message,
				whatsappUrl: whatsappUrl,
				clientName: clientName,
				workLocation: workLocation,
				arrivalDate: scheduledDate && scheduledTime ? `${scheduledDate}T${scheduledTime}` : null,
			},
		});
	} catch (err: any) {
		console.error('Error en API send-whatsapp:', err);
		return NextResponse.json(
			{ error: err.message || 'Error interno del servidor' },
			{ status: 500 }
		);
	}
}

// GET endpoint to test WhatsApp configuration
export async function GET(req: Request) {
	try {
		const auth = await authorize(req, API_PERMISSIONS.notifyClient);
		if ('response' in auth) return auth.response;
		return NextResponse.json({
			success: true,
			message: 'Configuración de WhatsApp verificada exitosamente',
			config: {
				method: 'wa.me URL generation',
				description: 'Genera URLs de WhatsApp para enviar mensajes directamente',
				testNumber: '3584178955', // change this to AR Aberturas test number
			},
		});
	} catch (err: any) {
		console.error('Error verificando configuración de WhatsApp:', err);
		return NextResponse.json(
			{
				success: false,
				error: err.message || 'Error en la configuración de WhatsApp',
			},
			{ status: 500 }
		);
	}
}
