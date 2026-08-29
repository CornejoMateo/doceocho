import { getSupabaseClient } from '../supabase-client';
import type { SupabaseClient } from '@supabase/supabase-js';

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
};

const TABLE = 'modules';

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

// Mes basado en 1 (1 = enero, 12 = diciembre), como viene de getLocalDate().
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

		const { data, error } = await supabase
			.from(TABLE)
			.select(`*, works:work_id (name, locality, address, hood, zone)`)
			.gte('created_at', startOfMonth)
			.lte('created_at', endOfMonth)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error en la consulta de módulos del mes:', {
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
		console.error('Error inesperado en listModulesForCurrentMonth:', error);
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

	// Borrar el módulo primero: el ON DELETE CASCADE elimina las filas de
	// modules_files solas. Si el delete del módulo falla, no se tocó nada.
	const { error } = await supabase.from(TABLE).delete().eq('id', id);
	if (error) {
		return { data: null, error };
	}

	// Después del cascade las filas ya no existen y deleteModuleFile no puede
	// usarse (su lookup de fila fallaría). Quitamos los objetos directamente
	// del bucket con los storage_path guardados; es best-effort: si falla solo
	// quedan objetos huérfanos, el módulo ya está eliminado.
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

// monthOneBased: 1 = enero, 12 = diciembre.
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
