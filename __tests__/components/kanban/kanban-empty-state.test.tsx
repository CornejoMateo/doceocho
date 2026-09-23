import { render, screen } from '@testing-library/react';
import { LayoutList } from 'lucide-react';
import { KanbanEmptyState } from '@/components/business/kanban/kanban-empty-state';

describe('KanbanEmptyState', () => {
	it('explains what is missing, not just that it is missing', () => {
		render(
			<KanbanEmptyState
				icon={LayoutList}
				title="Todavía no hay tableros"
				description="Un tablero es un trabajo que querés seguir de principio a fin."
			/>
		);

		expect(screen.getByText('Todavía no hay tableros')).toBeInTheDocument();
		expect(
			screen.getByText('Un tablero es un trabajo que querés seguir de principio a fin.')
		).toBeInTheDocument();
	});

	it('renders an action when one is given', () => {
		render(
			<KanbanEmptyState
				icon={LayoutList}
				title="Sin listas"
				description="Una lista es una etapa."
				action={<button type="button">Crear lista</button>}
			/>
		);

		expect(screen.getByRole('button', { name: 'Crear lista' })).toBeInTheDocument();
	});

	it('omits the action for users who cannot create anything', () => {
		render(<KanbanEmptyState icon={LayoutList} title="Sin listas" description="Una etapa." />);

		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});
});
