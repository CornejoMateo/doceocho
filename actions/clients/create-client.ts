'use server';

import { createClient as createClientDb, createClientFolder } from '@/lib/clients/clients';
import { getServerSupabaseClient } from '@/lib/get-server-supabase-client';
import { sendClientCreatedNotification } from '@/actions/push/send-client-notification';
import { after } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

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
		const supabase = await getServerSupabaseClient();
		const user = await getCurrentUser();

		const { data: client, error } = await createClientDb(clientData, supabase);

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

		console.log('[push] createClientAction completed, scheduling after() push', {
			clientId: client.id,
			name: clientData.name,
			last_name: clientData.last_name,
		});

		after(async () => {
			console.log('[push] after() callback started', {
				clientId: client.id,
				name: clientData.name,
				last_name: clientData.last_name,
			});

			try {
				await sendClientCreatedNotification(supabase, clientData.name, clientData.last_name);
			} catch (error: any) {
				console.error('[push] Failed to send client notification:', {
					clientId: client.id,
					error: error.message,
				});
			}
		});

		return { success: true, data: client };
	} catch (error: any) {
		return { success: false, error: error.message };
	}
}
