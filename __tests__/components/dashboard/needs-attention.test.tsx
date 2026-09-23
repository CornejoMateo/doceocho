import { render, screen } from '@testing-library/react';
import { NeedsAttention } from '@/components/dashboard/needs-attention';

const none = { appointments: 0, vacations: 0, signatures: 0 };

describe('NeedsAttention', () => {
	it('says everything is resolved when nothing is pending', () => {
		render(<NeedsAttention pending={none} isLoading={false} />);

		expect(screen.getByText('No hay nada esperándote')).toBeInTheDocument();
	});

	// Hiding the empty ones made the panel look like it only watched whatever
	// happened to be pending, so nobody could tell what it actually covers.
	it('always shows every tile, so what the panel watches is discoverable', () => {
		render(<NeedsAttention pending={none} isLoading={false} />);

		expect(screen.getByText('citas esperando respuesta')).toBeInTheDocument();
		expect(screen.getByText('pedidos de vacaciones sin resolver')).toBeInTheDocument();
		expect(screen.getByText('presupuestos esperando firma')).toBeInTheDocument();
	});

	it('keeps showing the other tiles when only one has something pending', () => {
		render(
			<NeedsAttention
				pending={{ appointments: 2, vacations: 0, signatures: 0 }}
				isLoading={false}
			/>
		);

		expect(screen.getByText('citas esperando respuesta')).toBeInTheDocument();
		expect(screen.getByText('pedidos de vacaciones sin resolver')).toBeInTheDocument();
		expect(screen.getAllByRole('link')).toHaveLength(3);
	});

	it('drops the all-clear as soon as something is pending', () => {
		render(
			<NeedsAttention
				pending={{ appointments: 0, vacations: 1, signatures: 0 }}
				isLoading={false}
			/>
		);

		expect(screen.queryByText('No hay nada esperándote')).not.toBeInTheDocument();
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
			'/employees?tab=vacaciones',
			'/clients',
		]);
	});

	it('does not claim everything is fine while it is still loading', () => {
		render(<NeedsAttention pending={none} isLoading={true} />);

		expect(screen.queryByText('No hay nada esperándote')).not.toBeInTheDocument();
		expect(screen.getByText('Revisando pendientes...')).toBeInTheDocument();
	});
});
