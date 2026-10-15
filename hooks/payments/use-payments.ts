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
import {
	PaymentSupplierWithDetails,
	createPaymentSupplier,
	deletePaymentSupplier,
	listPaymentsSuppliersForYear,
	updatePaymentSupplier,
} from '@/lib/suppliers/payments-suppliers';
import { listPurchasesSuppliersWithBalance } from '@/lib/suppliers/purchases-suppliers';
import { purchaseStatus } from '@/helpers/suppliers/suppliers';
import { formatCurrency, normalizeMoney } from '@/utils/formats-money';
import { formatShortDate } from '@/utils/format-date';

function toGeneralEntry(row: PaymentWithDetails): CollectionPaymentEntry {
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
		purchase_supplier_id: null,
	};
}

function toSupplierEntry(row: PaymentSupplierWithDetails): CollectionPaymentEntry {
	return {
		id: row.id,
		date: row.paid_date,
		created_at: row.created_at,
		receipt_number: row.receipt_number,
		work_id: row.work_id,
		work_name: row.work_name,
		party_id: row.supplier_id,
		party_name: row.supplier_name,
		category_id: row.category_id,
		category_name: row.category_name,
		description: row.notes,
		amount: row.amount_ars,
		payment_method_id: row.payment_method_id,
		payment_method_name: row.payment_method_name ?? 'Sin método',
		bank_account_id: row.bank_account_id,
		bank_account_name: row.bank_account_name,
		source: 'supplier',
		purchase_supplier_id: row.purchase_supplier_id,
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
	};
}

function toPaymentSupplierInput(input: EntrySavePayload) {
	return {
		paid_date: input.date,
		receipt_number: input.receipt_number,
		work_id: input.work_id,
		category_id: input.category_id,
		amount_ars: input.amount,
		payment_method_id: input.payment_method_id,
		bank_account_id: input.bank_account_id,
		purchase_supplier_id: input.purchase_supplier_id as number,
		notes: input.description,
	};
}

export function usePayments() {
	return useCollectionPaymentTab({
		categoryKind: 'payment',
		partyOptional: true,
		listEntries: async (year) => {
			const [generalRes, supplierRes] = await Promise.all([
				listPayments({ year }),
				listPaymentsSuppliersForYear(year),
			]);
			if (generalRes.error) return { data: null, error: generalRes.error };
			if (supplierRes.error) return { data: null, error: supplierRes.error };
			const merged = [
				...(generalRes.data ?? []).map(toGeneralEntry),
				...(supplierRes.data ?? []).map(toSupplierEntry),
			].sort((a, b) => {
				if (a.date !== b.date) return a.date < b.date ? 1 : -1;
				// Deterministic tie-break for same-day entries: newest created_at first, then id desc.
				const aCreated = a.created_at ?? '';
				const bCreated = b.created_at ?? '';
				if (aCreated !== bCreated) return aCreated < bCreated ? 1 : -1;
				if (a.id !== b.id) return b.id - a.id;
				// Final tie-break: ids can collide across source tables once merged.
				return (a.source ?? '').localeCompare(b.source ?? '');
			});
			return { data: merged, error: null };
		},
		createEntry: async (input) => {
			if (input.party_id && input.purchase_supplier_id) {
				const { error } = await createPaymentSupplier(toPaymentSupplierInput(input));
				return { error };
			}
			const { error } = await createPayment(toPaymentInput(input));
			return { error };
		},
		updateEntry: async (id, input, entry) => {
			if (entry.source === 'supplier') {
				const { error } = await updatePaymentSupplier(id, toPaymentSupplierInput(input));
				return { error };
			}
			const { error } = await updatePayment(id, toPaymentInput(input));
			return { error };
		},
		deleteEntry: (id, entry) =>
			entry.source === 'supplier' ? deletePaymentSupplier(id) : deletePayment(id),
		listParties: async () => {
			const { data, error } = await listSuppliers();
			if (error) return { data: null, error };
			return {
				data: (data ?? []).map((s) => ({ id: s.id, name: s.name })),
				error: null,
			};
		},

		loadPurchases: async (supplierId, exclude) => {
			const { data, error } = await listPurchasesSuppliersWithBalance(supplierId);
			if (error) return { data: null, error };
			return {
				data: (data ?? []).map((p) => {
					const totalPaidArs =
						exclude && exclude.purchaseId === p.id
							? normalizeMoney(p.totalPaidArs - exclude.amount)
							: p.totalPaidArs;
					const balanceArs = normalizeMoney(p.amount_ars - totalPaidArs);
					const status = purchaseStatus({ balanceArs, totalPaidArs });
					const isSettled = status === 'pagada' || status === 'a-favor';
					const base = `${formatShortDate(p.created_at)} · ${formatCurrency(p.amount_ars)}${
						p.notes ? ` · ${p.notes.slice(0, 40)}` : ''
					}`;
					return {
						id: p.id,
						name: isSettled ? `${base} (saldada)` : `${base} · Saldo ${formatCurrency(balanceArs)}`,
						isSettled,
					};
				}),
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
