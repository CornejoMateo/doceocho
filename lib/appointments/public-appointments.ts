import type { AppointmentStatus } from '@/constants/appointments/appointments';
import type { Slot } from '@/helpers/appointments/availability';

export type AvailabilityDay = {
	date: string;
	slots: Slot[];
};

export type PublicAvailability = {
	days: AvailabilityDay[];
	slotDurationMinutes: number;
};

export type AppointmentRequestInput = {
	clientName: string;
	clientEmail: string;
	clientPhone?: string;
	date: string;
	startTime: string;
	notes?: string;
};

export type PublicAppointmentStatus = {
	clientName: string;
	date: string;
	startTime: string;
	endTime: string;
	notes: string | null;
	status: AppointmentStatus;
	adminNotes: string | null;
};

async function readError(response: Response, fallback: string): Promise<string> {
	try {
		const body = await response.json();
		return body?.error || fallback;
	} catch {
		return fallback;
	}
}

export async function fetchAvailability(): Promise<{
	data: PublicAvailability | null;
	error: string | null;
}> {
	try {
		const response = await fetch('/api/appointments/availability');

		if (!response.ok) {
			return {
				data: null,
				error: await readError(response, 'No pudimos cargar la disponibilidad'),
			};
		}

		return { data: await response.json(), error: null };
	} catch {
		return { data: null, error: 'No pudimos cargar la disponibilidad' };
	}
}

export async function requestAppointment(
	input: AppointmentRequestInput
): Promise<{ token: string | null; error: string | null }> {
	try {
		const response = await fetch('/api/appointments/request', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input),
		});

		if (!response.ok) {
			return { token: null, error: await readError(response, 'No pudimos registrar tu cita') };
		}

		const body = await response.json();

		return { token: body.token, error: null };
	} catch {
		return { token: null, error: 'No pudimos registrar tu cita' };
	}
}

export async function fetchAppointmentStatus(
	token: string
): Promise<{ data: PublicAppointmentStatus | null; error: string | null }> {
	try {
		const response = await fetch(`/api/appointments/status/${token}`);

		if (!response.ok) {
			return { data: null, error: await readError(response, 'No encontramos esa cita') };
		}

		return { data: await response.json(), error: null };
	} catch {
		return { data: null, error: 'No encontramos esa cita' };
	}
}
