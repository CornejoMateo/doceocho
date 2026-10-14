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
import { listSuppliers } from '@/lib/suppliers/suppliers';

function toEntry(row: PaymentWithDetails): CollectionPaymentEntry {
	return {
		id: row.id,
		date: row.date,
		receipt_number: row.receipt_number,
		work_id: row.work_id,
		work_name: row.work_name,
		party_id: row.supplier_id,
		party_name: row.supplier_name,
		category_id: row.category_id,
		category_name: row.category_name,
		description: row.description,
		amount: row.amount,
		payment_method_id: row.payment_method_id,
		payment_method_name: row.payment_method_name,
		bank_account_id: row.bank_account_id,
		bank_account_name: row.bank_account_name,
	};
}

function toPaymentInput(input: EntrySavePayload) {
	return {
		date: input.date,
		receipt_number: input.receipt_number,
		work_id: input.work_id,
		supplier_id: input.party_id,
		category_id: input.category_id,
		description: input.description,
		amount: input.amount,
		payment_method_id: input.payment_method_id,
		bank_account_id: input.bank_account_id,
	};
}

export function usePayments() {
	return useCollectionPaymentTab({
		categoryKind: 'payment',
		listEntries: async (year) => {
			const { data, error } = await listPayments({ year });
			if (error) return { data: null, error };
			return { data: (data ?? []).map(toEntry), error: null };
		},
		createEntry: async (input) => {
			const { error } = await createPayment(toPaymentInput(input));
			return { error };
		},
		updateEntry: async (id, input) => {
			const { error } = await updatePayment(id, toPaymentInput(input));
			return { error };
		},
		deleteEntry: deletePayment,
		listParties: async () => {
			const { data, error } = await listSuppliers();
			if (error) return { data: null, error };
			return {
				data: (data ?? []).map((s) => ({ id: s.id, name: s.name })),
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
