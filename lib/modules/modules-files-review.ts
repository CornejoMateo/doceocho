'use server';

import { requireCurrentUserAdmin } from '@/lib/auth/require-admin';
import { TABLE as MODULES_FILES_TABLE } from '@/lib/modules/modules-files';

type ReviewStatus = 'approved' | 'rejected';

export async function reviewModuleFileAction(
	fileId: number,
	status: ReviewStatus,
	adminDescription: string | null
): Promise<{ success: boolean; error?: string; warning?: string }> {
	try {
		const { adminSupabase } = await requireCurrentUserAdmin();

		const { data: updatedFile, error } = await adminSupabase
			.from(MODULES_FILES_TABLE)
			.update({ status, admin_description: adminDescription })
			.eq('id', fileId)
			.select('module_id')
			.single();

		if (error || !updatedFile) {
			return { success: false, error: error?.message ?? 'No se pudo actualizar el archivo.' };
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
