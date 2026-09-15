import { TABLE as MODULES_TABLE, syncModuleAggregateStatus } from '@/lib/modules/modules';
import { TABLE as MODULES_FILES_TABLE } from '@/lib/modules/modules-files';
import { getSupabaseClient } from '../supabase-client';

const MODULE_STATUS_SYNC_WARNING =
	'El archivo se reenvió a revisión correctamente, pero no se pudo actualizar el estado general del módulo. Es posible que el módulo no refleje el cambio de inmediato.';

const CORRECTION_SYNC_WARNING =
	'El archivo se corrigió correctamente, pero no se pudo actualizar el estado general del módulo. Es posible que la lista de administración no lo refleje de inmediato.';

export async function resubmitModuleFileAction(
	fileId: number
): Promise<{ success: boolean; error?: string; warning?: string }> {
	try {
		const supabase = getSupabaseClient();

		const { data: fileWithModule, error: fetchError } = await supabase
			.from(MODULES_FILES_TABLE)
			.select('id, module_id, status, modules:module_id(user_id)')
			.eq('id', fileId)
			.single();

		if (fetchError || !fileWithModule) {
			return { success: false, error: 'No se encontró el archivo.' };
		}

		const moduleOwnerId = (fileWithModule.modules as unknown as { user_id: string } | null)
			?.user_id;

		if (!moduleOwnerId) {
			return {
				success: false,
				error: 'No tenés permisos para reenviar este archivo a revisión.',
			};
		}

		if (fileWithModule.status !== 'rejected') {
			return {
				success: false,
				error: 'Solo se pueden reenviar a revisión archivos rechazados.',
			};
		}

		const { error: updateError } = await supabase
			.from(MODULES_FILES_TABLE)
			.update({ status: null })
			.eq('id', fileId);

		if (updateError) {
			return {
				success: false,
				error: updateError.message ?? 'No se pudo reenviar el archivo a revisión.',
			};
		}

		const { success: syncSuccess, error: syncError } = await syncModuleAggregateStatus(
			supabase,
			fileWithModule.module_id
		);

		if (!syncSuccess) {
			console.error(
				'No se pudo recalcular el status agregado del módulo tras reenviar el archivo:',
				syncError
			);
			return { success: true, warning: MODULE_STATUS_SYNC_WARNING };
		}

		return { success: true };
	} catch (e: any) {
		return { success: false, error: e?.message ?? 'Ocurrió un error inesperado.' };
	}
}

export async function syncModuleStatusAction(
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
			return { success: false, error: 'No se encontró el módulo.' };
		}

		const { success, error } = await syncModuleAggregateStatus(supabase, moduleId);

		if (!success) {
			console.error(
				'No se pudo sincronizar el status agregado del módulo tras corregir el archivo:',
				error
			);
			return { success: true, warning: CORRECTION_SYNC_WARNING };
		}

		return { success: true };
	} catch (e: any) {
		return { success: false, error: e?.message ?? 'Ocurrió un error inesperado.' };
	}
}
