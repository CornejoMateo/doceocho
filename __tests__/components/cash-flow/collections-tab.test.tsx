import { render, screen } from '@testing-library/react';
import { CollectionsTab } from '@/components/business/cash-flow/collections-payments/collections-tab';
import { useCollections } from '@/hooks/collections/use-collections';

jest.mock('@/hooks/collections/use-collections', () => ({
	useCollections: jest.fn(),
}));

jest.mock('@/components/business/cash-flow/collections-payments/collection-payment-tab', () => ({
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

describe('CollectionsTab', () => {
	it('wires useCollections state and collection-specific labels into CollectionPaymentTab', () => {
		(useCollections as jest.Mock).mockReturnValue({ year: 2026 });

		render(<CollectionsTab categoriesConfig={<button>Configurar categorías</button>} />);

		expect(screen.getByTestId('entity-label')).toHaveTextContent('cobro');
		expect(screen.getByTestId('party-label')).toHaveTextContent('Cliente');
		expect(screen.getByTestId('add-label')).toHaveTextContent('Nuevo cobro');
		expect(screen.getByTestId('empty-label')).toHaveTextContent('No hay cobros registrados');
		expect(screen.getByTestId('grid-title')).toHaveTextContent('Cobros por mes');
		expect(screen.getByTestId('year')).toHaveTextContent('2026');
		expect(screen.getByText('Configurar categorías')).toBeInTheDocument();
	});
});
