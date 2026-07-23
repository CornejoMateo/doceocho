import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

interface EmailRequest {
	clientId: number;
	workId: number;
	to: string;
	subject: string;
	message: string;
	scheduledDate?: string;
	scheduledTime?: string;
}

// Create transporter
const createTransporter = () => {
	// Production configuration (Gmail)
	return nodemailer.createTransport({
		host: process.env.SMTP_HOST || 'smtp.gmail.com',
		port: parseInt(process.env.SMTP_PORT || '587'),
		secure: process.env.SMTP_SECURE === 'true',
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASS,
		},
	});
};

export async function POST(req: Request) {
	try {
		const body: EmailRequest = await req.json();

		const { clientId, workId, to, subject, message, scheduledDate, scheduledTime } = body;

		// Validate required fields
		if (!to || !subject || !message) {
			return NextResponse.json(
				{ error: 'Faltan campos requeridos: a quien se dirige, asunto, mensaje' },
				{ status: 400 }
			);
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(to)) {
			return NextResponse.json({ error: 'El formato del email es inválido' }, { status: 400 });
		}

		// Get client and work information for logging
		const supabase = createClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
		);

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

		// Create email transporter
		const transporter = createTransporter();

		// Prepare email options
		const mailOptions = {
			from: process.env.EMAIL_FROM || 'noreply@Doceocho.com',
			to: to,
			subject: subject,
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
					<div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
						<div style="text-align: center; margin-bottom: 30px;">
							<h1 style="color: #333; margin: 0; font-size: 24px;">Doceocho</h1>
							<p style="color: #666; margin: 5px 0 0; font-size: 14px;">Sistema de Notificaciones por dlay.com.ar</p>
						</div>
						
						<div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
							<h2 style="color: #333; margin: 0 0 10px; font-size: 18px;">Notificación de Obra</h2>
							<p style="color: #666; margin: 0; font-size: 14px;">
								<strong>Cliente:</strong> ${clientName}<br>
								<strong>Ubicación de la obra:</strong> ${workLocation}
							</p>
						</div>
						
						<div style="margin-bottom: 20px;">
							<h3 style="color: #333; margin: 0 0 10px; font-size: 16px;">Mensaje:</h3>
							<div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #007bff; border-radius: 4px;">
								<p style="color: #333; margin: 0; white-space: pre-line; font-size: 14px;">${message}</p>
							</div>
						</div>
						
						${
							scheduledDate || scheduledTime
								? `
						<div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
							<p style="color: #856404; margin: 0; font-size: 14px;">
								<strong>🏗️ Fecha y hora de llegada:</strong> 
								${
									scheduledDate
										? new Date(scheduledDate + 'T00:00:00').toLocaleDateString('es-AR', {
												weekday: 'long',
												year: 'numeric',
												month: 'long',
												day: 'numeric',
												timeZone: 'America/Argentina/Buenos_Aires',
											})
										: ''
								}
								${scheduledTime ? ` a las ${scheduledTime}` : ''}
							</p>
						</div>
						`
								: ''
						}
						
						<div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
							<p style="color: #666; margin: 0; font-size: 12px;">
								Este email fue enviado automáticamente por el sistema de Doceocho.<br>
								Si tiene preguntas, por favor contacte a su representante de ventas.
							</p>
						</div>
					</div>
				</div>
			`,
		};

		// Send email immediately
		const info = await transporter.sendMail(mailOptions);
		console.log('Email sent successfully:', info.messageId);

		return NextResponse.json({
			success: true,
			message: 'Email enviado exitosamente',
			data: {
				messageId: info.messageId,
				to: to,
				subject: subject,
				arrivalDate: scheduledDate && scheduledTime ? `${scheduledDate}T${scheduledTime}` : null,
			},
		});
	} catch (err: any) {
		console.error('Error en API send-email:', err);
		return NextResponse.json(
			{ error: err.message || 'Error interno del servidor' },
			{ status: 500 }
		);
	}
}

// GET endpoint to test email configuration
export async function GET() {
	try {
		const transporter = createTransporter();
		await transporter.verify();

		return NextResponse.json({
			success: true,
			message: 'Configuración de email verificada exitosamente',
			config: {
				host: process.env.SMTP_HOST || 'smtp.ethereal.email',
				port: process.env.SMTP_PORT || '587',
				secure: process.env.SMTP_SECURE === 'true',
				user: process.env.SMTP_USER ? '***configured***' : 'not configured',
			},
		});
	} catch (err: any) {
		console.error('Error verificando configuración de email:', err);
		return NextResponse.json(
			{
				success: false,
				error: err.message || 'Error en la configuración de email',
				config: {
					host: process.env.SMTP_HOST || 'not configured',
					port: process.env.SMTP_PORT || 'not configured',
					user: process.env.SMTP_USER ? '***configured***' : 'not configured',
				},
			},
			{ status: 500 }
		);
	}
}
