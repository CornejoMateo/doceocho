import { TABLE as MODULES_TABLE, syncModuleAggregateStatus } from '@/lib/modules/modules';
import { TABLE as MODULES_FILES_TABLE } from '@/lib/modules/modules-files';
import { getSupabaseClient } from '../supabase-client';

const MODULE_STATUS_SYNC_WARNING =
	'El archivo se reenvió a revisión correctamente, pero no se pudo actualizar el estado general del módulo. Es posible que el módulo no refleje el cambio de inmediato.';

export async function resubmitAllRejectedFilesAction(
	moduleId: number
): Promise<{ success: boolean; error?: string; warning?: string }> {
	try {
		const supabase = getSupabaseClient();

		const { data: moduleRow, error: moduleError } = await supabase
			.from(MODULES_TABLE)
			.select('user_id')
			.eq('id', moduleId)
			.single();

		if (moduleError || !moduleRow) {
			return {
				success: false,
				error: 'No se encontró el módulo o no tenés permisos para modificarlo.',
			};
		}

		const { error: updateError } = await supabase
			.from(MODULES_FILES_TABLE)
			.update({ status: null })
			.eq('module_id', moduleId)
			.eq('status', 'rejected');

		if (updateError) {
			return {
				success: false,
				error: updateError.message ?? 'No se pudieron reenviar los archivos a revisión.',
			};
		}

		const { success: syncSuccess, error: syncError } = await syncModuleAggregateStatus(
			supabase,
			moduleId
		);

		if (!syncSuccess) {
			console.error(
				'No se pudo recalcular el status agregado del módulo tras reenviar los archivos:',
				syncError
			);
			return { success: true, warning: MODULE_STATUS_SYNC_WARNING };
		}

		return { success: true };
	} catch (e: any) {
		return { success: false, error: e?.message ?? 'Ocurrió un error inesperado.' };
	}
}
