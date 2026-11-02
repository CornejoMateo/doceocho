import { render, screen } from '@testing-library/react';
import { EditOnly, EditScope } from '@/components/permissions/edit-scope';

// The real permission check, fed by a mocked session.
jest.unmock('@/hooks/permissions/use-can-edit');

const mockUser = {
	role: 'Taller',
	views: ['clients', 'clients.budgets', 'works'],
	edits: ['clients.budgets'],
};
jest.mock('@/components/provider/auth-provider', () => ({
	useAuth: () => ({ user: mockUser }),
}));

describe('components/permissions/edit-scope', () => {
	test('shows the action where the user can edit', () => {
		render(
			<EditScope edit="clients.budgets">
				<EditOnly>
					<button>Nuevo presupuesto</button>
				</EditOnly>
			</EditScope>
		);

		expect(screen.getByText('Nuevo presupuesto')).toBeInTheDocument();
	});

	test('hides it where the user can only look', () => {
		render(
			<EditScope edit="works">
				<EditOnly>
					<button>Nueva obra</button>
				</EditOnly>
			</EditScope>
		);

		expect(screen.queryByText('Nueva obra')).not.toBeInTheDocument();
	});

	test('the nearest scope wins over the fallback, so a shared component follows where it is used', () => {
		render(
			<EditScope edit="clients.budgets">
				<EditOnly edit="works">
					<button>Editar</button>
				</EditOnly>
			</EditScope>
		);

		expect(screen.getByText('Editar')).toBeInTheDocument();
	});

	test('outside any scope the fallback permission decides', () => {
		render(
			<EditOnly edit="works">
				<button>Eliminar</button>
			</EditOnly>
		);

		expect(screen.queryByText('Eliminar')).not.toBeInTheDocument();
	});
});
