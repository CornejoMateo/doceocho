import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KanbanList } from '@/components/business/kanban/kanban-list';

const mockAddCard = jest.fn();

jest.mock('@/hooks/kanban/use-cards', () => ({
	useCards: jest.fn(() => ({
		cards: [],
		loading: false,
		addCard: mockAddCard,
	})),
}));

jest.mock('@dnd-kit/core', () => ({
	useDroppable: jest.fn(() => ({ setNodeRef: jest.fn(), isOver: false })),
	DndContext: ({ children }: any) => children,
}));

jest.mock('@dnd-kit/sortable', () => ({
	useSortable: jest.fn(() => ({
		attributes: {},
		listeners: {},
		setNodeRef: jest.fn(),
		transform: null,
		transition: null,
		isDragging: false,
	})),
	SortableContext: ({ children }: any) => children,
	verticalListSortingStrategy: jest.fn(),
}));

jest.mock('@dnd-kit/utilities', () => ({
	CSS: { Transform: { toString: jest.fn() } },
}));

jest.mock('@/lib/clients/clients', () => ({
	listClients: jest.fn().mockResolvedValue({ data: [] }),
}));

jest.mock('@/utils/format-date', () => ({
	formatCreatedAt: jest.fn(() => '1 ene 2024'),
}));

const mockList = { id: 1, created_at: '2024-01-01', board_id: 1, name: 'To Do' };

describe('KanbanList', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	const defProps = {
		onEditList: jest.fn(),
		onDeleteList: jest.fn(),
		onCreateCard: jest.fn(),
		onCardClick: jest.fn(),
		onCardMove: jest.fn(),
	};

	it('renders list name and card count', () => {
		render(<KanbanList list={mockList} cards={[]} {...defProps} />);

		expect(screen.getByText('To Do')).toBeInTheDocument();
		expect(screen.getByText('0')).toBeInTheDocument();
	});

	it('renders cards when provided via props', () => {
		const cards = [
			{
				id: 1,
				created_at: '2024-01-01',
				list_id: 1,
				title: 'Card 1',
				description: null,
				position: 0,
				due_date: null,
				priority: 'none' as const,
				completed_at: null,
				color: null,
			},
			{
				id: 2,
				created_at: '2024-01-01',
				list_id: 1,
				title: 'Card 2',
				description: null,
				position: 1,
				due_date: null,
				priority: 'none' as const,
				completed_at: null,
				color: null,
			},
		];

		render(<KanbanList list={mockList} cards={cards} {...defProps} />);

		expect(screen.getByText('Card 1')).toBeInTheDocument();
		expect(screen.getByText('Card 2')).toBeInTheDocument();
		expect(screen.getByText('2')).toBeInTheDocument();
	});

	it('shows empty message when no cards', () => {
		render(<KanbanList list={mockList} cards={[]} {...defProps} />);

		expect(screen.getByText('No hay tarjetas')).toBeInTheDocument();
	});

	it('calls onCardClick when a card is clicked', () => {
		const onCardClick = jest.fn();
		const cards = [
			{
				id: 1,
				created_at: '2024-01-01',
				list_id: 1,
				title: 'Card 1',
				description: null,
				position: 0,
				due_date: null,
				priority: 'none' as const,
				completed_at: null,
				color: null,
			},
		];

		render(<KanbanList list={mockList} cards={cards} {...defProps} onCardClick={onCardClick} />);

		fireEvent.click(screen.getByText('Card 1'));
		expect(onCardClick).toHaveBeenCalledWith(1);
	});

	it('opens create modal and shows card creation form', async () => {
		mockAddCard.mockResolvedValue({ title: 'New Card' });

		render(<KanbanList list={mockList} cards={[]} {...defProps} />);

		fireEvent.click(screen.getByText('Agregar tarjeta'));

		await waitFor(() => {
			expect(screen.getByRole('heading', { name: /crear tarjeta/i })).toBeInTheDocument();
		});

		fireEvent.click(screen.getByText('Tarjeta normal'));

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /crear tarjeta/i })).toBeInTheDocument();
		});
	});

	it('opens edit modal when menu button is clicked', () => {
		render(<KanbanList list={mockList} cards={[]} {...defProps} />);

		fireEvent.click(screen.getByRole('button', { name: /opciones de la lista/i }));
		expect(screen.getAllByText('Editar nombre de la lista').length).toBeGreaterThan(0);
	});
});
