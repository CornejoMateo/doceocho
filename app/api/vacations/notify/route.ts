import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServerSupabaseClient } from '@/lib/get-server-supabase-client';
import { getUserByUid } from '@/lib/users/users';
import {
	sendVacationRequestedNotification,
	sendVacationResolvedNotification,
} from '@/lib/push/send-vacation-notification';
import { formatCreatedAt } from '@/utils/format-date';

type NotifyEvent = 'created' | 'resolved';

function buildDateRange(startDate: string, endDate: string) {
	return `${formatCreatedAt(startDate)} al ${formatCreatedAt(endDate)}`;
}

export async function POST(req: NextRequest) {
	try {
		const user = await getCurrentUser();
		const { requestId, event } = (await req.json()) as {
			requestId?: number;
			event?: NotifyEvent;
		};

		if (!requestId || (event !== 'created' && event !== 'resolved')) {
			return NextResponse.json({ success: false, message: 'Datos inválidos' }, { status: 400 });
		}

		const supabase = await getServerSupabaseClient();

		// RLS already limits what this user can read, so a missing row means no access.
		const { data: request, error } = await supabase
			.from('vacation_requests')
			.select('*')
			.eq('id', requestId)
			.maybeSingle();

		if (error || !request) {
			return NextResponse.json(
				{ success: false, message: 'Solicitud no encontrada' },
				{ status: 404 }
			);
		}

		const dateRange = buildDateRange(request.start_date, request.end_date);

		if (event === 'created') {
			// Only the owner of a still pending request can announce it.
			if (request.user_id !== user.id || request.status !== 'Pendiente') {
				return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 403 });
			}

			const { data: requester } = await getUserByUid(user.id, supabase);
			const requesterName =
				`${requester?.name ?? ''} ${requester?.last_name ?? ''}`.trim() ||
				requester?.username ||
				'Un empleado';

			const result = await sendVacationRequestedNotification(supabase, requesterName, dateRange);

			return NextResponse.json({ success: result.success, sentCount: result.sentCount });
		}

		// Resolved: only an admin announces the decision, and only once it is taken.
		const { data: reviewer } = await getUserByUid(user.id, supabase);

		if (reviewer?.role !== 'Admin') {
			return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 403 });
		}

		if (request.status !== 'Aprobada' && request.status !== 'Rechazada') {
			return NextResponse.json(
				{ success: false, message: 'La solicitud sigue pendiente' },
				{ status: 400 }
			);
		}

		const result = await sendVacationResolvedNotification(
			supabase,
			request.user_id,
			request.status,
			dateRange,
			request.reviewer_notes
		);

		return NextResponse.json({ success: result.success, sentCount: result.sentCount });
	} catch (error: any) {
		console.error('[vacations] Failed to send notification:', error);

		return NextResponse.json(
			{ success: false, message: error.message ?? 'Error al notificar' },
			{ status: 500 }
		);
	}
}
