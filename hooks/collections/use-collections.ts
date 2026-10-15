'use client';

import {
	CollectionPaymentEntry,
	EntrySavePayload,
	useCollectionPaymentTab,
} from '@/hooks/collection-payment/use-collection-payment-tab';
import {
	CollectionWithDetails,
	createCollection,
	deleteCollection,
	listCollections,
	updateCollection,
} from '@/lib/collections/collections';
import {
	BalanceTransactionWithDetails,
	createTransaction,
	deleteTransaction,
	listBalanceTransactionsForYear,
	updateTransaction,
} from '@/lib/balances/balance_transactions';
import { getBalancesByClientId } from '@/lib/balances/balances';
import { listClients } from '@/lib/clients/clients';
import { formatDateOnly } from '@/utils/format-date';

function toGeneralEntry(row: CollectionWithDetails): CollectionPaymentEntry {
	return {
		id: row.id,
		date: row.date,
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
		balance_id: null,
	};
}

function toClientEntry(row: BalanceTransactionWithDetails): CollectionPaymentEntry {
	return {
		id: row.id,
		date: row.date as string, // mapRowWithDetails always fills a fallback date
		created_at: row.created_at,
		receipt_number: row.receipt_number ?? null,
		work_id: row.work_id ?? null,
		work_name: row.work_name,
		party_id: row.client_id,
		party_name: row.client_name,
		category_id: row.category_id ?? null,
		category_name: row.category_name,
		description: row.notes ?? null,
		amount: Number(row.amount) || 0,
		payment_method_id: row.payment_method_id ?? null,
		payment_method_name: row.payment_method_name,
		bank_account_id: row.bank_account_id ?? null,
		bank_account_name: row.bank_account_name,
		source: 'client',
		balance_id: row.balance_id ?? null,
	};
}

function toCollectionInput(input: EntrySavePayload) {
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

function toBalanceTransactionInput(input: EntrySavePayload) {
	return {
		balance_id: input.balance_id as number,
		date: input.date,
		amount: input.amount,
		payment_method: input.payment_method_name,
		payment_method_id: input.payment_method_id,
		notes: input.description,
		bank_account_id: input.bank_account_id,
		work_id: input.work_id,
		category_id: input.category_id,
		receipt_number: input.receipt_number,
		quote_usd: null,
		usd_amount: null,
	};
}

export function useCollections() {
	return useCollectionPaymentTab({
		categoryKind: 'collection',
		partyOptional: true,
		linkedLabel: 'Cuenta',
		listEntries: async (year) => {
			const [generalRes, clientRes] = await Promise.all([
				listCollections({ year }),
				listBalanceTransactionsForYear(year),
			]);
			if (generalRes.error) return { data: null, error: generalRes.error };
			if (clientRes.error) return { data: null, error: clientRes.error };
			const merged = [
				...(generalRes.data ?? []).map(toGeneralEntry),
				...(clientRes.data ?? []).map(toClientEntry),
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
			if (input.party_id && input.balance_id) {
				const { error } = await createTransaction(toBalanceTransactionInput(input));
				return { error };
			}
			const { error } = await createCollection(toCollectionInput(input));
			return { error };
		},
		updateEntry: async (id, input, entry) => {
			if (entry.source === 'client') {
				const { error } = await updateTransaction(id, toBalanceTransactionInput(input));
				return { error };
			}
			const { error } = await updateCollection(id, toCollectionInput(input));
			return { error };
		},
		deleteEntry: async (id, entry) => {
			if (entry.source === 'client') {
				const { error } = await deleteTransaction(id);
				return { error };
			}
			return deleteCollection(id);
		},
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

		loadAccounts: async (clientId) => {
			const { data, error } = await getBalancesByClientId(clientId);
			if (error) return { data: null, error };
			return {
				data: (data ?? []).map((balance) => {
					const work = balance.budget?.folder_budget?.work;
					const workLabel =
						work?.name || [work?.locality, work?.address].filter(Boolean).join(' - ') || null;
					const concept = balance.budget?.number ? `Presupuesto ${balance.budget.number}` : null;
					const startLabel = balance.start_date
						? `Desde ${formatDateOnly(balance.start_date)}`
						: null;
					const parts = [
						workLabel || concept,
						startLabel,
						balance.notes ? balance.notes.slice(0, 40) : null,
					].filter(Boolean);
					return {
						id: balance.id,
						name: parts.length ? parts.join(' · ') : `Cuenta #${balance.id}`,
					};
				}),
				error: null,
			};
		},
		labels: {
			entityLabel: 'cobro',
			loadError: 'No se pudieron cargar los cobros.',
			saveError: 'No se pudo guardar el cobro.',
			deleteError: 'No se pudo eliminar el cobro.',
			createdToast: 'Cobro creado',
			updatedToast: 'Cobro actualizado',
			deletedToast: 'Cobro eliminado',
		},
	});
}
