import { getSupabaseClient } from '../supabase-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { deriveModuleStatusFromFiles, TABLE as MODULES_FILES_TABLE } from './modules-files';

import { getLocalDate } from '@/utils/format-date';
import { fromZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Argentina/Buenos_Aires';

export type Module = {
	id: number;
	created_at?: string;
	user_id?: string | null;
	status?: string | null;
	title?: string | null;
	description?: string | null;
	admin_description?: string | null;
	amount?: number | null;
	work_id?: number | null;
	work_name?: string | null;
	works?: {
		name: string | null;
		locality?: string | null;
		address?: string | null;
		hood?: string | null;
		zone?: string | null;
	} | null;
	users?: {
		name?: string | null;
		last_name?: string | null;
		username?: string | null;
	} | null;
};

export const TABLE = 'modules';

export async function listModules(): Promise<{ data: Module[] | null; error: any }> {
	try {
		const supabase = getSupabaseClient();

		const { data, error } = await supabase
			.from(TABLE)
			.select(
				`
				*,
				works:work_id (name, locality, address, hood, zone)
			`
			)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error en la consulta de módulos con JOIN:', {
				message: error.message,
				details: error.details,
			});
			return { data: null, error };
		}

		const modulesWithWorkNames = data.map((module) => ({
			...module,
			work_name: module.works?.name || null,
		}));

		return { data: modulesWithWorkNames, error: null };
	} catch (error) {
		console.error('Error inesperado en listModules:', error);
		return {
			data: null,
			error: error instanceof Error ? error : new Error('Error desconocido'),
		};
	}
}

export async function listModulesForCurrentMonth(): Promise<{ data: Module[] | null; error: any }> {
	try {
		const supabase = getSupabaseClient();

		const [year, month] = getLocalDate().split('-').map(Number);

		const lastDay = new Date(year, month, 0).getDate();

		const startOfMonth = fromZonedTime(
			`${year}-${String(month).padStart(2, '0')}-01T00:00:00`,
			TIMEZONE
		).toISOString();

		const endOfMonth = fromZonedTime(
			`${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999`,
			TIMEZONE
		).toISOString();

		const selectQuery = `*, works:work_id (name, locality, address, hood, zone), users (name, last_name, username)`;

		// Display both pending/rejected modules and modules created in the current month
		const [pendingRejectedResult, currentMonthResult] = await Promise.all([
			supabase.from(TABLE).select(selectQuery).in('status', ['pending', 'rejected']),
			supabase
				.from(TABLE)
				.select(selectQuery)
				.or('status.is.null,status.eq.not_send,status.eq.approved')
				.gte('created_at', startOfMonth)
				.lte('created_at', endOfMonth),
		]);

		if (pendingRejectedResult.error) {
			console.error('Error en la consulta de módulos pendientes/rechazados del mes:', {
				message: pendingRejectedResult.error.message,
				details: pendingRejectedResult.error.details,
			});
			return { data: null, error: pendingRejectedResult.error };
		}

		if (currentMonthResult.error) {
			console.error('Error en la consulta de módulos del mes:', {
				message: currentMonthResult.error.message,
				details: currentMonthResult.error.details,
			});
			return { data: null, error: currentMonthResult.error };
		}

		const combined = [...pendingRejectedResult.data, ...currentMonthResult.data];

		const modulesWithWorkNames = combined
			.map((module) => ({
				...module,
				work_name: module.works?.name || null,
			}))
			.sort(
				(a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
			);

		return { data: modulesWithWorkNames, error: null };
	} catch (error) {
		console.error('Error inesperado en listModulesForCurrentMonth:', error);
		return {
			data: null,
			error: error instanceof Error ? error : new Error('Error desconocido'),
		};
	}
}

export async function listModulesPendingRejected(): Promise<{ data: Module[] | null; error: any }> {
	try {
		const supabase = getSupabaseClient();

		const { data, error } = await supabase
			.from(TABLE)
			.select(
				`*, works:work_id (name, locality, address, hood, zone), users (name, last_name, username)`
			)
			.in('status', ['pending', 'rejected'])
			.order('status', { ascending: true })
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error en la consulta de módulos pendientes y rechazados:', {
				message: error.message,
				details: error.details,
			});
			return { data: null, error };
		}

		const modulesWithWorkNames = data.map((module) => ({
			...module,
			work_name: module.works?.name || null,
		}));

		return { data: modulesWithWorkNames, error: null };
	} catch (error) {
		console.error('Error inesperado en listModulesPendingRejected:', error);
		return {
			data: null,
			error: error instanceof Error ? error : new Error('Error desconocido'),
		};
	}
}

export async function getModuleById(id: number): Promise<{ data: Module | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(TABLE)
		.select(
			`
			*,
			works:work_id (name, locality, address, hood, zone)
		`
		)
		.eq('id', id)
		.single();

	if (data && data.works) {
		data.work_name = data.works.name;
	}

	return { data, error };
}

export async function getModulesByWorkId(
	workId: number
): Promise<{ data: Module[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.eq('work_id', workId)
		.order('created_at', { ascending: false });

	return { data, error };
}

export async function getModulesByUserId(
	userId: string
): Promise<{ data: Module[] | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase
		.from(TABLE)
		.select(
			`
			*,
			works:work_id (name, locality, address, hood, zone)
		`
		)
		.eq('user_id', userId)
		.order('created_at', { ascending: false });

	if (error) {
		return { data: null, error };
	}

	const modulesWithWorkNames = data.map((module) => ({
		...module,
		work_name: module.works?.name || null,
	}));

	return { data: modulesWithWorkNames, error: null };
}

export async function createModule(
	module: Omit<Module, 'id' | 'created_at'>,
	supabaseClient?: SupabaseClient
): Promise<{ data: Module | null; error: any }> {
	const supabase = supabaseClient ?? getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).insert(module).select().single();
	return { data, error };
}

export async function updateModule(
	id: number,
	changes: Partial<Omit<Module, 'id' | 'created_at'>>
): Promise<{ data: Module | null; error: any }> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.from(TABLE).update(changes).eq('id', id).select().single();
	return { data, error };
}

export async function deleteModule(id: number): Promise<{ data: null; error: any }> {
	const supabase = getSupabaseClient();

	const { data: files, error: filesError } = await supabase
		.from('modules_files')
		.select('storage_path')
		.eq('module_id', id);

	if (filesError) {
		return { data: null, error: filesError };
	}

	const { error } = await supabase.from(TABLE).delete().eq('id', id);
	if (error) {
		return { data: null, error };
	}

	const storagePaths = (files ?? []).map((f) => f.storage_path).filter(Boolean);
	if (storagePaths.length > 0) {
		const { error: deleteStorageError } = await supabase.storage
			.from('modules')
			.remove(storagePaths);
		if (deleteStorageError) {
			console.error('No se pudieron eliminar objetos de storage del módulo eliminado:', {
				moduleId: id,
				paths: storagePaths,
				error: deleteStorageError,
			});
		}
	}

	return { data: null, error: null };
}

export async function getUserModulesForMonth(
	userId: string,
	year: number,
	monthOneBased: number
): Promise<{ data: Module[] | null; error: any }> {
	try {
		const supabase = getSupabaseClient();

		const startOfMonth = fromZonedTime(
			`${year}-${String(monthOneBased).padStart(2, '0')}-01T00:00:00`,
			TIMEZONE
		).toISOString();

		const lastDay = new Date(year, monthOneBased, 0).getDate();

		const endOfMonth = fromZonedTime(
			`${year}-${String(monthOneBased).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999`,
			TIMEZONE
		).toISOString();

		const { data, error } = await supabase
			.from(TABLE)
			.select(`*, works:work_id (name, locality, address, hood, zone)`)
			.eq('user_id', userId)
			.gte('created_at', startOfMonth)
			.lte('created_at', endOfMonth)
			.order('created_at', { ascending: false });

		if (error) return { data: null, error };

		const modulesWithWorkNames = data.map((module) => ({
			...module,
			work_name: module.works?.name || null,
		}));

		return { data: modulesWithWorkNames, error: null };
	} catch (error) {
		console.error('Error inesperado en getUserModulesForMonth:', error);
		return {
			data: null,
			error: error instanceof Error ? error : new Error('Error desconocido'),
		};
	}
}

// Method to recompute and persist the module's aggregate status based on its files' statuses
export async function syncModuleAggregateStatus(
	supabase: SupabaseClient,
	moduleId: number
): Promise<{ success: boolean; error?: any }> {
	const { data: siblingFiles, error: filesError } = await supabase
		.from(MODULES_FILES_TABLE)
		.select('status')
		.eq('module_id', moduleId);

	if (filesError) {
		return { success: false, error: filesError };
	}
	if (!siblingFiles || siblingFiles.length === 0) {
		return { success: true };
	}

	const derivedStatus = deriveModuleStatusFromFiles(siblingFiles);

	const { error: moduleUpdateError } = await supabase
		.from(TABLE)
		.update({ status: derivedStatus })
		.eq('id', moduleId);

	if (moduleUpdateError) {
		return { success: false, error: moduleUpdateError };
	}

	return { success: true };
}
