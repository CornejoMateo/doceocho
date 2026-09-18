import { getSupabaseClient } from '@/lib/supabase-client';
import type { AppointmentStatus } from '@/constants/appointments/appointments';

const TABLE = 'appointments';

export type Appointment = {
	id: number;
	created_at: string;
	updated_at: string;
	public_token: string;
	client_name: string;
	client_email: string;
	client_phone: string | null;
	date: string;
	start_time: string;
	end_time: string;
	notes: string | null;
	status: AppointmentStatus;
	admin_notes: string | null;
	reviewed_by: string | null;
	reviewed_at: string | null;
	event_id: number | null;
};

/** Admin only: RLS keeps this table away from everyone else. */
export async function listAppointments(): Promise<{ data: Appointment[] | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.order('date', { ascending: false })
		.order('start_time', { ascending: false });

	if (error) {
		return { data: null, error };
	}

	return { data: data ?? [], error: null };
}

export async function resolveAppointment(
	appointmentId: number,
	status: Extract<AppointmentStatus, 'Aceptada' | 'Rechazada'>,
	reviewerId: string,
	adminNotes?: string | null,
	eventId?: number | null
): Promise<{ data: Appointment | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(TABLE)
		.update({
			status,
			admin_notes: adminNotes || null,
			reviewed_by: reviewerId,
			reviewed_at: new Date().toISOString(),
			event_id: eventId ?? null,
		})
		.eq('id', appointmentId)
		.select()
		.single();

	return { data, error };
}

export async function cancelAppointment(
	appointmentId: number
): Promise<{ data: Appointment | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(TABLE)
		.update({ status: 'Cancelada' })
		.eq('id', appointmentId)
		.select()
		.single();

	return { data, error };
}
