type AppointmentEmailInput = {
	clientName: string;
	date: string;
	startTime: string;
	endTime: string;
	status: 'Aceptada' | 'Rechazada';
	adminNotes?: string | null;
	statusUrl: string;
};

function formatDate(date: string): string {
	const [year, month, day] = date.split('-');

	return `${day}/${month}/${year}`;
}

export function buildAppointmentEmail({
	clientName,
	date,
	startTime,
	endTime,
	status,
	adminNotes,
	statusUrl,
}: AppointmentEmailInput) {
	const wasAccepted = status === 'Aceptada';
	const readableDate = formatDate(date);
	const schedule = `${readableDate} de ${startTime} a ${endTime}`;

	const subject = wasAccepted
		? `✅ Tu cita del ${readableDate} fue confirmada`
		: `Tu solicitud de cita del ${readableDate}`;

	const headline = wasAccepted ? '¡Tu cita fue confirmada!' : 'Tu solicitud no pudo ser confirmada';
	const accentColor = wasAccepted ? '#10b981' : '#ef4444';

	const intro = wasAccepted
		? `Hola ${clientName}, confirmamos tu cita para el <strong>${schedule}</strong>.`
		: `Hola ${clientName}, lamentablemente no podemos atenderte el <strong>${schedule}</strong>.`;

	const notesBlock = adminNotes
		? `<div style="border-left: 4px solid ${accentColor}; padding: 12px 16px; margin: 16px 0; background-color: #f8fafc; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.6;">${adminNotes}</p>
      </div>`
		: '';

	const closing = wasAccepted
		? '<p style="color: #64748b; font-size: 14px;">Si necesitás reprogramarla, respondé este correo.</p>'
		: '<p style="color: #64748b; font-size: 14px;">Podés solicitar otro horario cuando quieras desde nuestro calendario.</p>';

	const html = `<!DOCTYPE html>
<html lang="es">
  <head><meta charset="utf-8" /></head>
  <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: Arial, Helvetica, sans-serif;">
    <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 32px;">
      <h1 style="margin: 0 0 16px 0; color: ${accentColor}; font-size: 22px;">${headline}</h1>
      <p style="color: #334155; font-size: 15px; line-height: 1.6;">${intro}</p>
      ${notesBlock}
      ${closing}
      <p style="margin-top: 24px;">
        <a href="${statusUrl}" style="color: #2563eb; font-size: 14px;">Ver el estado de tu cita</a>
      </p>
      <p style="margin-top: 32px; color: #94a3b8; font-size: 12px;">Doce Ocho</p>
    </div>
  </body>
</html>`;

	const text = [
		headline,
		'',
		wasAccepted
			? `Hola ${clientName}, confirmamos tu cita para el ${schedule}.`
			: `Hola ${clientName}, lamentablemente no podemos atenderte el ${schedule}.`,
		adminNotes ? `\n${adminNotes}` : '',
		'',
		`Ver el estado de tu cita: ${statusUrl}`,
		'',
		'Doce Ocho',
	].join('\n');

	return { subject, html, text };
}
