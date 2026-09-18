'use server';

import { getServerSupabaseClient } from '@/lib/get-server-supabase-client';
import { getCurrentUser } from '@/lib/auth';
import { sendModuleSubmittedNotification } from '@/actions/push/send-module-notification';

export async function notifyModuleSubmittedAction(moduleId: number) {
	try {
		const supabase = await getServerSupabaseClient();
		const user = await getCurrentUser();

		const { data: moduleRow, error } = await supabase
			.from('modules')
			.select('user_id, title, status, users (name, last_name, username)')
			.eq('id', moduleId)
			.single();

		if (error || !moduleRow) {
			return { success: false, error: 'No se encontró el módulo.' };
		}

		if (moduleRow.user_id !== user.id) {
			return { success: false, error: 'No tenés permisos para notificar sobre este módulo.' };
		}

		if (moduleRow.status !== 'pending') {
			return { success: false, error: 'El módulo no está pendiente de revisión.' };
		}

		const ownerUser = Array.isArray(moduleRow.users) ? moduleRow.users[0] : moduleRow.users;
		const ownerName =
			[ownerUser?.name, ownerUser?.last_name].filter(Boolean).join(' ').trim() ||
			ownerUser?.username ||
			'Un usuario';
		const moduleTitle = moduleRow.title?.trim() || 'Sin título';

		try {
			const { after } = await import('next/server');
			after(async () => {
				try {
					await sendModuleSubmittedNotification(supabase, moduleTitle, ownerName);
				} catch (error: any) {
					console.error('Failed to send module submitted notification:', error.message);
				}
			});
		} catch (e) {}

		return { success: true };
	} catch (error: any) {
		console.error('Failed to schedule module submitted notification:', error.message);
		return { success: false, error: error.message };
	}
}
