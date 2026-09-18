import nodemailer from 'nodemailer';
import { buildAppointmentEmail } from '@/templates/appointment-email';

type SendInput = {
	to: string;
	clientName: string;
	date: string;
	startTime: string;
	endTime: string;
	status: 'Aceptada' | 'Rechazada';
	adminNotes?: string | null;
	statusUrl: string;
};

// Same SMTP setup already used by /api/send-email.
function createTransporter() {
	return nodemailer.createTransport({
		host: process.env.SMTP_HOST || 'smtp.gmail.com',
		port: parseInt(process.env.SMTP_PORT || '587'),
		secure: process.env.SMTP_SECURE === 'true',
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASS,
		},
	});
}

export async function sendAppointmentEmail(
	input: SendInput
): Promise<{ success: boolean; error?: string }> {
	if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
		return { success: false, error: 'SMTP is not configured' };
	}

	try {
		const { subject, html, text } = buildAppointmentEmail(input);

		await createTransporter().sendMail({
			from: `"Doce Ocho" <${process.env.SMTP_USER}>`,
			to: input.to,
			subject,
			html,
			text,
		});

		return { success: true };
	} catch (error: any) {
		console.error('[appointments] Failed to send email:', error);

		return { success: false, error: error.message };
	}
}
