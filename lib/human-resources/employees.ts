import { getSupabaseClient } from '@/lib/supabase-client';
import type { EmployeeStatus } from '@/constants/human-resources/employees';
import {
	deleteEmployeeDocumentFiles,
	listEmployeeDocuments,
} from '@/lib/human-resources/employee-documents';

const TABLE = 'employees';

export type Employee = {
	id: number;
	created_at: string;
	// Optional link to the system user (users.uid_user) when the employee has a login.
	user_id: string | null;
	name: string;
	last_name: string;
	identity_number: string | null;
	birth_date: string | null;
	phone_number: string | null;
	email: string | null;
	address: string | null;
	locality: string | null;
	position: string | null;
	hire_date: string | null;
	termination_date: string | null;
	status: EmployeeStatus;
	emergency_contact_name: string | null;
	emergency_contact_phone: string | null;
	notes: string | null;
};

export type EmployeeInput = Omit<Employee, 'id' | 'created_at'>;

export async function listEmployees(): Promise<{ data: Employee[] | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.order('last_name', { ascending: true });

	if (error) {
		return { data: null, error };
	}

	return { data: data ?? [], error: null };
}

export async function getEmployeeById(
	employeeId: number
): Promise<{ data: Employee | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase.from(TABLE).select('*').eq('id', employeeId).maybeSingle();

	if (error) {
		return { data: null, error };
	}

	return { data, error: null };
}

export async function createEmployee(
	input: Partial<EmployeeInput>
): Promise<{ data: Employee | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase.from(TABLE).insert(input).select().single();

	if (error) {
		return { data: null, error };
	}

	return { data, error: null };
}

export async function updateEmployee(
	employeeId: number,
	changes: Partial<EmployeeInput>
): Promise<{ data: Employee | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(TABLE)
		.update(changes)
		.eq('id', employeeId)
		.select()
		.single();

	if (error) {
		return { data: null, error };
	}

	return { data, error: null };
}

// Deleting an employee also removes its documents through the FK cascade,
// so the stored files are cleaned up first.
export async function deleteEmployee(employeeId: number): Promise<{ error: any }> {
	const supabase = getSupabaseClient();

	const { data: documents, error: documentsError } = await listEmployeeDocuments(employeeId);

	if (documentsError) {
		return { error: documentsError };
	}

	const paths = (documents ?? []).map((document) => document.path);

	if (paths.length > 0) {
		const { error: storageError } = await deleteEmployeeDocumentFiles(paths);

		// A storage failure should not block removing the employee record.
		if (storageError) {
			console.error('Error removing employee documents from storage:', storageError);
		}
	}

	const { error } = await supabase.from(TABLE).delete().eq('id', employeeId);

	return { error };
}

export function getEmployeeFullName(employee: Employee): string {
	return `${employee.last_name} ${employee.name}`.trim();
}
