'use server';

import { createWork as createWorkDb } from '@/lib/works/works';
import { getServerSupabaseClient } from '@/lib/get-server-supabase-client';
import { sendWorkCreatedNotification } from '@/actions/push/send-work-notification';
import { getCurrentUser } from '@/lib/auth';

export async function createWorkAction(workData: {
	name: string | null;
	locality?: string | null;
	address?: string | null;
	client_id?: number | null;
	status?: string | null;
	architect?: string | null;
	general_note?: string | null;
	balance_id?: string | null;
	furniture?: string | null;
	zone?: string | null;
	hood?: string | null;
}) {
	try {
		const supabase = await getServerSupabaseClient();

		const { data: work, error } = await createWorkDb(workData, supabase);

		if (error) {
			return { success: false, error: error.message };
		}

		if (!work) {
			return { success: false, error: 'Error al crear la obra' };
		}

		// Dynamically import `after` to avoid pulling `next/server` at test time
		try {
			const { after } = await import('next/server');
			after(async () => {
				try {
					await sendWorkCreatedNotification(supabase, work.name || 'Nueva obra');
				} catch (error: any) {
					console.error('Failed to send work notification:', error.message);
				}
			});
		} catch (e) {
			// If dynamic import fails (e.g. test environment), just skip scheduling the notification
		}

		return { success: true, data: work };
	} catch (error: any) {
		return { success: false, error: error.message };
	}
}
