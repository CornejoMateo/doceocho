'use server';

import { requireCurrentUserAdmin } from '@/lib/auth/require-admin';
import { deriveModuleStatusFromFiles } from '@/lib/modules/modules-files';
import { TABLE as MODULES_TABLE } from '@/lib/modules/modules';
import { TABLE as MODULES_FILES_TABLE } from '@/lib/modules/modules-files';
import { sendModuleReviewedNotification } from '@/actions/push/send-module-notification';

export async function submitModuleReviewAction(
	moduleId: number,
	adminDescription: string | null,
	amount: number | null
): Promise<{ success: boolean; error?: string }> {
	try {
		const { adminSupabase } = await requireCurrentUserAdmin();

		const { data: files, error: filesError } = await adminSupabase
			.from(MODULES_FILES_TABLE)
			.select('status')
			.eq('module_id', moduleId);

		if (filesError) {
			return {
				success: false,
				error: filesError.message ?? 'No se pudieron obtener los archivos del módulo.',
			};
		}

		if (!files || files.length === 0) {
			return {
				success: false,
				error: 'El módulo no tiene archivos para revisar.',
			};
		}

		const hasUnreviewedFile = files.some((f) => !f.status);
		if (hasUnreviewedFile) {
			return {
				success: false,
				error:
					'Todavía hay archivos sin revisar. Revisá todos los archivos antes de enviar la respuesta.',
			};
		}

		const derivedStatus = deriveModuleStatusFromFiles(files);

		if (derivedStatus === 'approved') {
			if (amount === null || amount === undefined || Number.isNaN(amount) || amount <= 0) {
				return {
					success: false,
					error: 'Para aprobar el módulo es necesario cargar un monto válido mayor a 0.',
				};
			}
		}

		const updatePayload: {
			status: string;
			admin_description: string | null;
			amount: number | null;
		} = {
			status: derivedStatus,
			admin_description: adminDescription,
			amount: derivedStatus === 'approved' ? (amount as number) : null,
		};

		const { data: updatedModule, error: updateError } = await adminSupabase
			.from(MODULES_TABLE)
			.update(updatePayload)
			.eq('id', moduleId)
			.select('user_id, title')
			.single();

		if (updateError) {
			return {
				success: false,
				error: updateError.message ?? 'No se pudo guardar la respuesta del módulo.',
			};
		}

		if (updatedModule?.user_id) {
			try {
				const { after } = await import('next/server');
				after(async () => {
					try {
						await sendModuleReviewedNotification(
							adminSupabase,
							updatedModule.user_id,
							updatedModule.title ?? 'Sin título',
							derivedStatus === 'approved' ? 'approved' : 'rejected'
						);
					} catch (error: any) {
						console.error('Failed to send module reviewed notification:', error.message);
					}
				});
			} catch (e) {}
		}

		return { success: true };
	} catch (e: any) {
		if (e?.message === 'FORBIDDEN') {
			return {
				success: false,
				error: 'No tenés permisos de administrador para realizar esta acción.',
			};
		}
		return { success: false, error: e?.message ?? 'Ocurrió un error inesperado.' };
	}
}
