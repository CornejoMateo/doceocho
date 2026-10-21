'use client';

import {
	EntrySavePayload,
	IncomeExpenseEntry,
	useIncomeExpenseTab,
} from '@/hooks/income-expense/use-income-expense-tab';
import {
	ExpenseWithDetails,
	createExpense,
	deleteExpense,
	listExpenses,
	updateExpense,
} from '@/lib/expenses/expenses';
import { listSuppliers } from '@/lib/suppliers/suppliers';

function toEntry(row: ExpenseWithDetails): IncomeExpenseEntry {
	return {
		id: row.id,
		date: row.date,
		voucher_number: row.voucher_number,
		voucher_type_id: row.voucher_type_id,
		voucher_type_name: row.voucher_type_name,
		work_id: row.work_id,
		work_name: row.work_name,
		party_id: row.supplier_id,
		party_name: row.supplier_name,
		category_id: row.category_id,
		category_name: row.category_name,
		description: row.description,
		net_amount: row.net_amount,
		iva_percent: row.iva_percent,
		iva_amount: row.iva_amount,
		total_amount: row.total_amount,
		payment_method_id: row.payment_method_id,
		payment_method_name: row.payment_method_name,
		bank_account_id: row.bank_account_id,
		bank_account_name: row.bank_account_name,
	};
}

function toExpenseInput(input: EntrySavePayload) {
	return {
		date: input.date,
		voucher_number: input.voucher_number,
		voucher_type_id: input.voucher_type_id,
		work_id: input.work_id,
		supplier_id: input.party_id,
		category_id: input.category_id,
		description: input.description,
		net_amount: input.net_amount,
		iva_percent: input.iva_percent,
		iva_amount: input.iva_amount,
		total_amount: input.total_amount,
		payment_method_id: input.payment_method_id,
		bank_account_id: input.bank_account_id,
	};
}

export function useExpenses() {
	return useIncomeExpenseTab({
		categoryKind: 'expense',
		listEntries: async (year) => {
			const { data, error } = await listExpenses({ year });
			if (error) return { data: null, error };
			return { data: (data ?? []).map(toEntry), error: null };
		},
		createEntry: async (input) => {
			const { error } = await createExpense(toExpenseInput(input));
			return { error };
		},
		updateEntry: async (id, input) => {
			const { error } = await updateExpense(id, toExpenseInput(input));
			return { error };
		},
		deleteEntry: deleteExpense,
		listParties: async () => {
			const { data, error } = await listSuppliers();
			if (error) return { data: null, error };
			return {
				data: (data ?? []).map((s) => ({ id: s.id, name: s.name })),
				error: null,
			};
		},
		labels: {
			entityLabel: 'gasto',
			loadError: 'No se pudieron cargar los gastos.',
			saveError: 'No se pudo guardar el gasto.',
			deleteError: 'No se pudo eliminar el gasto.',
			createdToast: 'Gasto creado',
			updatedToast: 'Gasto actualizado',
			deletedToast: 'Gasto eliminado',
		},
	});
}
