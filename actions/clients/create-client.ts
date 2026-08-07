'use server';

import { createClient as createClientDb, createClientFolder } from '@/lib/clients/clients';
import { getServerSupabaseClient } from '@/lib/get-server-supabase-client';
import { sendClientCreatedNotification } from '@/actions/push/send-client-notification';

export async function createClientAction(clientData: {
	name: string;
	last_name: string;
	email?: string | null;
	phone_number?: string | null;
	locality?: string | null;
	contact_method?: string | null;
	referred_to?: string | null;
	identity_number?: string | null;
}) {
	try {
		const name = clientData.name?.trim();
		if (!name) {
			return { success: false, error: 'El nombre es obligatorio' };
		}

		const payload = { ...clientData, name };

		const supabase = await getServerSupabaseClient();

		const { data: client, error } = await createClientDb(payload, supabase);

		if (error) {
			return { success: false, error: error.message };
		}

		if (!client) {
			return { success: false, error: 'Error al crear el cliente' };
		}

		// Create folder in Storage
		const folderResult = await createClientFolder(client.id, supabase);
		if (folderResult.error) {
			console.error('Error creating client folder:', folderResult.error);
		}

		// Dynamically import `after` to avoid pulling `next/server` at test time
		try {
			const { after } = await import('next/server');
			after(async () => {
				try {
					await sendClientCreatedNotification(supabase, payload.name, clientData.last_name);
				} catch (error: any) {
					console.error('Failed to send client notification:', error.message);
				}
			});
		} catch (e) {
			// If dynamic import fails (e.g. test environment), just skip scheduling the notification
		}

		return { success: true, data: client };
	} catch (error: any) {
		return { success: false, error: error.message };
	}
}
