import { render, screen } from '@testing-library/react';
import { ReceivablesSummary } from '@/components/dashboard/receivables-summary';

describe('ReceivablesSummary', () => {
	it('shows how many accounts and clients are behind the amount', () => {
		render(
			<ReceivablesSummary
				receivables={{ totalArs: 150000, balancesCount: 3, clientsCount: 2 }}
				isLoading={false}
			/>
		);

		expect(screen.getByText('3 cobros pendientes de 2 clientes')).toBeInTheDocument();
	});

	it('uses the singular for a single account and client', () => {
		render(
			<ReceivablesSummary
				receivables={{ totalArs: 50000, balancesCount: 1, clientsCount: 1 }}
				isLoading={false}
			/>
		);

		expect(screen.getByText('1 cobro pendiente de 1 cliente')).toBeInTheDocument();
	});

	it('says so plainly when there is nothing to collect', () => {
		render(
			<ReceivablesSummary
				receivables={{ totalArs: 0, balancesCount: 0, clientsCount: 0 }}
				isLoading={false}
			/>
		);

		expect(screen.getByText('No hay cobros pendientes')).toBeInTheDocument();
	});

	it('does not show a zero while it is still adding up', () => {
		render(
			<ReceivablesSummary
				receivables={{ totalArs: 0, balancesCount: 0, clientsCount: 0 }}
				isLoading={true}
			/>
		);

		expect(screen.getByText('Calculando...')).toBeInTheDocument();
		expect(screen.queryByText('No hay saldos pendientes de cobro')).not.toBeInTheDocument();
	});

	it('links to the balances report', () => {
		render(
			<ReceivablesSummary
				receivables={{ totalArs: 1000, balancesCount: 1, clientsCount: 1 }}
				isLoading={false}
			/>
		);

		expect(screen.getByRole('link')).toHaveAttribute('href', '/reports');
	});
});
