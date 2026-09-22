import { render, screen } from '@testing-library/react';
import { NeedsAttention } from '@/components/dashboard/needs-attention';

const none = { appointments: 0, vacations: 0, signatures: 0 };

describe('NeedsAttention', () => {
	it('says everything is resolved when nothing is pending', () => {
		render(<NeedsAttention pending={none} isLoading={false} />);

		expect(screen.getByText('No hay nada esperándote')).toBeInTheDocument();
	});

	// A row of zeros teaches nothing and pushes the useful part of the panel down.
	it('only shows what actually needs attention', () => {
		render(
			<NeedsAttention
				pending={{ appointments: 2, vacations: 0, signatures: 0 }}
				isLoading={false}
			/>
		);

		expect(screen.getByText('citas esperando respuesta')).toBeInTheDocument();
		expect(screen.queryByText(/vacaciones/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/firma/i)).not.toBeInTheDocument();
	});

	it('uses the singular for a single pending item', () => {
		render(
			<NeedsAttention
				pending={{ appointments: 1, vacations: 0, signatures: 0 }}
				isLoading={false}
			/>
		);

		expect(screen.getByText('cita esperando respuesta')).toBeInTheDocument();
	});

	it('links each pending item to the screen that resolves it', () => {
		render(
			<NeedsAttention
				pending={{ appointments: 1, vacations: 1, signatures: 1 }}
				isLoading={false}
			/>
		);

		const links = screen.getAllByRole('link');

		expect(links.map((link) => link.getAttribute('href'))).toEqual([
			'/calendar',
			'/human-resources',
			'/clients',
		]);
	});

	it('does not claim everything is fine while it is still loading', () => {
		render(<NeedsAttention pending={none} isLoading={true} />);

		expect(screen.queryByText('No hay nada esperándote')).not.toBeInTheDocument();
		expect(screen.getByText('Revisando pendientes...')).toBeInTheDocument();
	});
});
