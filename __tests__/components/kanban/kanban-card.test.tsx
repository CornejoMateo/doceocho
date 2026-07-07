import { render, screen, fireEvent } from '@testing-library/react';
import { KanbanCard } from '@/components/business/kanban/kanban-card';

jest.mock('@/utils/format-date', () => ({
	formatCreatedAt: jest.fn(() => '31 dic 2024'),
}));

const baseCard = {
	id: 1,
	created_at: '2024-01-01',
	list_id: 1,
	title: 'Test Card',
	description: 'A description',
	position: 0,
	due_date: null,
	priority: 'none' as const,
	completed_at: null,
	color: null,
	list: { id: 1, name: 'To Do', created_at: '2024-01-01', updated_at: '2024-01-01', board_id: 1 },
	files: [],
};

describe('KanbanCard', () => {
	it('renders title and description', () => {
		render(<KanbanCard card={baseCard} onClick={jest.fn()} />);
		expect(screen.getByText('Test Card')).toBeInTheDocument();
		expect(screen.getByText('A description')).toBeInTheDocument();
	});

	it('renders without description when null', () => {
		render(<KanbanCard card={{ ...baseCard, description: null }} onClick={jest.fn()} />);
		expect(screen.getByText('Test Card')).toBeInTheDocument();
		expect(screen.queryByText('A description')).not.toBeInTheDocument();
	});

	it('calls onClick when clicked', () => {
		const onClick = jest.fn();
		render(<KanbanCard card={baseCard} onClick={onClick} />);
		fireEvent.click(screen.getByText('Test Card'));
		expect(onClick).toHaveBeenCalled();
	});

	it('shows priority badge when priority is set', () => {
		render(<KanbanCard card={{ ...baseCard, priority: 'high' }} onClick={jest.fn()} />);
		expect(screen.getByText('Alta')).toBeInTheDocument();
	});

	it('hides priority badge when priority is none', () => {
		render(<KanbanCard card={baseCard} onClick={jest.fn()} />);
		expect(screen.queryByText('Sin prioridad')).not.toBeInTheDocument();
	});

	it('shows due date with clock icon when not overdue', () => {
		const futureDate = new Date(Date.now() + 86400000 * 10).toISOString();
		render(<KanbanCard card={{ ...baseCard, due_date: futureDate }} onClick={jest.fn()} />);
		expect(screen.getByTestId('icon-clock')).toBeInTheDocument();
		expect(screen.getByText('31 dic 2024')).toBeInTheDocument();
	});

	it('shows overdue alert when past due and not completed', () => {
		const pastDate = new Date(Date.now() - 86400000 * 3).toISOString();
		render(<KanbanCard card={{ ...baseCard, due_date: pastDate }} onClick={jest.fn()} />);
		expect(screen.getByTestId('icon-overdue')).toBeInTheDocument();
		expect(screen.getByText('31 dic 2024')).toBeInTheDocument();
	});

	it('shows check icon when completed past due', () => {
		const pastDate = new Date(Date.now() - 86400000 * 3).toISOString();
		render(
			<KanbanCard
				card={{ ...baseCard, due_date: pastDate, completed_at: '2024-06-01' }}
				onClick={jest.fn()}
			/>
		);
		expect(screen.getByTestId('icon-completed')).toBeInTheDocument();
		expect(screen.getByText('31 dic 2024')).toBeInTheDocument();
	});

	it('shows yellow alert within tolerance range', () => {
		const nearDate = new Date(Date.now() + 86400000 * 1).toISOString();
		render(
			<KanbanCard
				card={{ ...baseCard, due_date: nearDate }}
				onClick={jest.fn()}
				dueDateToleranceYellow={3}
				dueDateToleranceRed={0}
			/>
		);
		expect(screen.getByTestId('icon-yellow-alert')).toBeInTheDocument();
		expect(screen.getByText('31 dic 2024')).toBeInTheDocument();
	});

	it('shows red alert within red tolerance', () => {
		const nearFuture = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now
		render(
			<KanbanCard
				card={{ ...baseCard, due_date: nearFuture.toISOString() }}
				onClick={jest.fn()}
				dueDateToleranceYellow={3}
				dueDateToleranceRed={1}
			/>
		);
		expect(screen.getByTestId('icon-red-alert')).toBeInTheDocument();
		expect(screen.getByText('31 dic 2024')).toBeInTheDocument();
	});
});
