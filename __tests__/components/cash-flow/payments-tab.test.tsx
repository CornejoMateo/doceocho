import { render, screen } from '@testing-library/react';
import { PaymentsTab } from '@/components/business/cash-flow/payments-tab';
import { usePayments } from '@/hooks/payments/use-payments';

jest.mock('@/hooks/payments/use-payments', () => ({
	usePayments: jest.fn(),
}));

jest.mock('@/components/business/cash-flow/collection-payment-tab', () => ({
	CollectionPaymentTab: ({
		state,
		entityLabel,
		partyLabel,
		addLabel,
		emptyLabel,
		monthlyGridTitle,
		categoriesConfig,
	}: any) => (
		<div>
			<span data-testid="entity-label">{entityLabel}</span>
			<span data-testid="party-label">{partyLabel}</span>
			<span data-testid="add-label">{addLabel}</span>
			<span data-testid="empty-label">{emptyLabel}</span>
			<span data-testid="grid-title">{monthlyGridTitle}</span>
			<span data-testid="year">{state.year}</span>
			{categoriesConfig}
		</div>
	),
}));

describe('PaymentsTab', () => {
	it('wires usePayments state and payment-specific labels into CollectionPaymentTab', () => {
		(usePayments as jest.Mock).mockReturnValue({ year: 2026 });

		render(<PaymentsTab categoriesConfig={<button>Configurar categorías</button>} />);

		expect(screen.getByTestId('entity-label')).toHaveTextContent('pago');
		expect(screen.getByTestId('party-label')).toHaveTextContent('Proveedor');
		expect(screen.getByTestId('add-label')).toHaveTextContent('Nuevo pago');
		expect(screen.getByTestId('empty-label')).toHaveTextContent('No hay pagos registrados');
		expect(screen.getByTestId('grid-title')).toHaveTextContent('Pagos por mes');
		expect(screen.getByTestId('year')).toHaveTextContent('2026');
		expect(screen.getByText('Configurar categorías')).toBeInTheDocument();
	});
});
