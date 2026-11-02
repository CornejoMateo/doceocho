'use client';

import {
	CollectionPaymentEntry,
	EntrySavePayload,
	useCollectionPaymentTab,
} from '@/hooks/collection-payment/use-collection-payment-tab';
import {
	PaymentWithDetails,
	createPayment,
	deletePayment,
	listPayments,
	updatePayment,
} from '@/lib/payments/payments';
import { listExpenses } from '@/lib/expenses/expenses';
import { formatCurrency } from '@/utils/formats-money';
import { formatDateOnly } from '@/utils/format-date';

export function buildExpenseOptionLabel(expense: {
	date: string;
	voucher_number: string | null;
	description: string | null;
	total_amount: number;
	supplier_name?: string | null;
}): string {
	const identifier =
		expense.supplier_name || expense.voucher_number || expense.description || 'Gasto';
	return `${formatDateOnly(expense.date)} · ${identifier} · ${formatCurrency(expense.total_amount)}`;
}

function toEntry(row: PaymentWithDetails): CollectionPaymentEntry {
	return {
		id: row.id,
		date: row.date,
		created_at: row.created_at,
		receipt_number: row.receipt_number,
		work_id: row.work_id,
		work_name: row.work_name,
		party_id: null,
		party_name: null,
		category_id: row.category_id,
		category_name: row.category_name,
		description: row.description,
		amount: row.amount,
		payment_method_id: row.payment_method_id,
		payment_method_name: row.payment_method_name,
		bank_account_id: row.bank_account_id,
		bank_account_name: row.bank_account_name,
		source: 'general',
		expense_id: row.expense_id,
		expense_label: row.expense_id
			? buildExpenseOptionLabel({
					date: row.expense_date as string,
					voucher_number: row.expense_voucher_number,
					description: row.expense_description,
					total_amount: row.expense_total_amount as number,
				})
			: null,
	};
}

function toPaymentInput(input: EntrySavePayload) {
	return {
		date: input.date,
		receipt_number: input.receipt_number,
		work_id: input.work_id,
		category_id: input.category_id,
		description: input.description,
		amount: input.amount,
		payment_method_id: input.payment_method_id,
		bank_account_id: input.bank_account_id,
		expense_id: input.expense_id ?? null,
	};
}

export function usePayments() {
	return useCollectionPaymentTab({
		categoryKind: 'payment',
		hideParty: true,
		attachmentsKind: 'payment',
		paymentMethodOptional: true,
		listEntries: async (year) => {
			const { data, error } = await listPayments({ year });
			if (error) return { data: null, error };
			return { data: (data ?? []).map(toEntry), error: null };
		},
		createEntry: async (input) => {
			const { data, error } = await createPayment(toPaymentInput(input));
			return { data, error };
		},
		updateEntry: async (id, input) => {
			const { error } = await updatePayment(id, toPaymentInput(input));
			return { error };
		},
		deleteEntry: (id) => deletePayment(id),

		listExpenseOptions: async (year) => {
			const { data, error } = await listExpenses({ year });
			if (error) return { data: null, error };
			return {
				data: (data ?? []).map((e) => ({
					id: e.id,
					name: buildExpenseOptionLabel({ ...e, supplier_name: e.supplier_name }),
				})),
				error: null,
			};
		},

		labels: {
			entityLabel: 'pago',
			loadError: 'No se pudieron cargar los pagos.',
			saveError: 'No se pudo guardar el pago.',
			deleteError: 'No se pudo eliminar el pago.',
			createdToast: 'Pago creado',
			updatedToast: 'Pago actualizado',
			deletedToast: 'Pago eliminado',
		},
	});
}
