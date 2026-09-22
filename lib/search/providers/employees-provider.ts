import { Briefcase } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { buildIlikePattern } from '@/helpers/search/match';
import { RESULTS_PER_PROVIDER } from '@/constants/search/search';
import type { SearchProvider, SearchResult } from '@/lib/search/types';

type EmployeeRow = {
	id: number;
	name: string;
	last_name: string;
	position: string | null;
	identity_number: string | null;
};

function toResult(employee: EmployeeRow): SearchResult {
	return {
		id: `employees:${employee.id}`,
		title: `${employee.last_name} ${employee.name}`.trim(),
		subtitle: employee.position || undefined,
		icon: Briefcase,
		href: '/human-resources',
		keywords: employee.identity_number ? [employee.identity_number] : undefined,
	};
}

export const employeesProvider: SearchProvider = {
	id: 'employees',
	label: 'Empleados',
	// Employee records are admin only, matching the module's own RLS.
	roles: ['Admin'],
	order: 8,
	async search(term, signal) {
		const supabase = getSupabaseClient();
		const pattern = buildIlikePattern(term);

		const { data, error } = await supabase
			.from('employees')
			.select('id, name, last_name, position, identity_number')
			.or(
				`name.ilike.${pattern},last_name.ilike.${pattern},position.ilike.${pattern},identity_number.ilike.${pattern}`
			)
			.limit(RESULTS_PER_PROVIDER)
			.abortSignal(signal);

		if (error) throw error;

		return (data ?? []).map(toResult);
	},
};
