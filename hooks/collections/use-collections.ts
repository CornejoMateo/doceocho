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
import { listClients } from '@/lib/clients/clients';

function toEntry(row: CollectionWithDetails): CollectionPaymentEntry {
	return {
		id: row.id,
		date: row.date,
		receipt_number: row.receipt_number,
		work_id: row.work_id,
		work_name: row.work_name,
		party_id: row.client_id,
		party_name: row.client_name,
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

function toCollectionInput(input: EntrySavePayload) {
	return {
		date: input.date,
		receipt_number: input.receipt_number,
		work_id: input.work_id,
		client_id: input.party_id,
		category_id: input.category_id,
		description: input.description,
		amount: input.amount,
		payment_method_id: input.payment_method_id,
		bank_account_id: input.bank_account_id,
	};
}

export function useCollections() {
	return useCollectionPaymentTab({
		categoryKind: 'collection',
		listEntries: async (year) => {
			const { data, error } = await listCollections({ year });
			if (error) return { data: null, error };
			return { data: (data ?? []).map(toEntry), error: null };
		},
		createEntry: async (input) => {
			const { error } = await createCollection(toCollectionInput(input));
			return { error };
		},
		updateEntry: async (id, input) => {
			const { error } = await updateCollection(id, toCollectionInput(input));
			return { error };
		},
		deleteEntry: deleteCollection,
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
