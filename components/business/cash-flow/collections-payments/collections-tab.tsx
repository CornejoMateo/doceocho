'use client';

import { useCollections } from '@/hooks/collections/use-collections';
import { CollectionPaymentTab } from '@/components/business/cash-flow/collections-payments/collection-payment-tab';

type CollectionsTabProps = {
	categoriesConfig: React.ReactNode;
};

export function CollectionsTab({ categoriesConfig }: CollectionsTabProps) {
	const state = useCollections();
	return (
		<CollectionPaymentTab
			state={state}
			entityLabel="cobro"
			partyLabel="Cliente"
			addLabel="Nuevo cobro"
			emptyLabel="No hay cobros registrados"
			monthlyGridTitle="Cobros por mes"
			categoriesConfig={categoriesConfig}
		/>
	);
}
