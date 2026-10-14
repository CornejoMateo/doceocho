'use client';

import { usePayments } from '@/hooks/payments/use-payments';
import { CollectionPaymentTab } from '@/components/business/cash-flow/collection-payment-tab';

type PaymentsTabProps = {
	categoriesConfig: React.ReactNode;
};

export function PaymentsTab({ categoriesConfig }: PaymentsTabProps) {
	const state = usePayments();
	return (
		<CollectionPaymentTab
			state={state}
			entityLabel="pago"
			partyLabel="Proveedor"
			addLabel="Nuevo pago"
			emptyLabel="No hay pagos registrados"
			monthlyGridTitle="Pagos por mes"
			categoriesConfig={categoriesConfig}
		/>
	);
}
