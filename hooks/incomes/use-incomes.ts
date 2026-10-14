'use client';

import {
	EntrySavePayload,
	IncomeExpenseEntry,
	useIncomeExpenseTab,
} from '@/hooks/income-expense/use-income-expense-tab';
import {
	IncomeWithDetails,
	createIncome,
	deleteIncome,
	listIncomes,
	updateIncome,
} from '@/lib/incomes/incomes';
import { listClients } from '@/lib/clients/clients';

function toEntry(row: IncomeWithDetails): IncomeExpenseEntry {
	return {
		id: row.id,
		date: row.date,
		voucher_number: row.voucher_number,
		voucher_type_id: row.voucher_type_id,
		voucher_type_name: row.voucher_type_name,
		work_id: row.work_id,
		work_name: row.work_name,
		party_id: row.client_id,
		party_name: row.client_name,
		category_id: row.category_id,
		category_name: row.category_name,
		description: row.description,
		net_amount: row.net_amount,
		iva_percent: row.iva_percent,
		iva_amount: row.iva_amount,
		total_amount: row.total_amount,
	};
}

function toIncomeInput(input: EntrySavePayload) {
	return {
		date: input.date,
		voucher_number: input.voucher_number,
		voucher_type_id: input.voucher_type_id,
		work_id: input.work_id,
		client_id: input.party_id,
		category_id: input.category_id,
		description: input.description,
		net_amount: input.net_amount,
		iva_percent: input.iva_percent,
		iva_amount: input.iva_amount,
		total_amount: input.total_amount,
	};
}

export function useIncomes() {
	return useIncomeExpenseTab({
		categoryKind: 'income',
		listEntries: async (year) => {
			const { data, error } = await listIncomes({ year });
			if (error) return { data: null, error };
			return { data: (data ?? []).map(toEntry), error: null };
		},
		createEntry: async (input) => {
			const { error } = await createIncome(toIncomeInput(input));
			return { error };
		},
		updateEntry: async (id, input) => {
			const { error } = await updateIncome(id, toIncomeInput(input));
			return { error };
		},
		deleteEntry: deleteIncome,
		listParties: async () => {
			const { data, error } = await listClients();
			if (error) return { data: null, error };
			return {
				data: (data ?? []).map((c) => ({
					id: c.id,
					name: `${c.name || ''} ${c.last_name || ''}`.trim() || 'Cliente sin nombre',
				})),
				error: null,
			};
		},
		labels: {
			entityLabel: 'ingreso',
			loadError: 'No se pudieron cargar los ingresos.',
			saveError: 'No se pudo guardar el ingreso.',
			deleteError: 'No se pudo eliminar el ingreso.',
			createdToast: 'Ingreso creado',
			updatedToast: 'Ingreso actualizado',
			deletedToast: 'Ingreso eliminado',
		},
	});
}
