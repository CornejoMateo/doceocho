import { render, screen, fireEvent } from '@testing-library/react';
import { StatsCardsWorks } from '@/components/business/works/stats-cards-works';

describe('StatsCardsWorks', () => {
	const onStatusFilterChange = jest.fn();

	const stats = {
		totalCount: 20,
		pendingCount: 5,
		inProgressCount: 8,
		completedCount: 4,
		pausedCount: 2,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders all stat cards', () => {
		render(
			<StatsCardsWorks
				stats={stats}
				statusFilter="all"
				onStatusFilterChange={onStatusFilterChange}
			/>
		);

		expect(screen.getByText('Todas')).toBeInTheDocument();
		expect(screen.getByText('Pendientes')).toBeInTheDocument();
		expect(screen.getByText('En progreso')).toBeInTheDocument();
		expect(screen.getByText('Finalizadas')).toBeInTheDocument();
		expect(screen.getByText('En pausa')).toBeInTheDocument();
		expect(screen.queryByText('Activas')).not.toBeInTheDocument();
	});

	it('renders correct counts', () => {
		render(
			<StatsCardsWorks
				stats={stats}
				statusFilter="all"
				onStatusFilterChange={onStatusFilterChange}
			/>
		);

		expect(screen.getByText('20')).toBeInTheDocument();
		expect(screen.getByText('5')).toBeInTheDocument();
		expect(screen.getByText('8')).toBeInTheDocument();
		expect(screen.getByText('4')).toBeInTheDocument();
		expect(screen.getByText('2')).toBeInTheDocument();
	});

	it('highlights "Todas" card when filter is "all"', () => {
		const { container } = render(
			<StatsCardsWorks
				stats={stats}
				statusFilter="all"
				onStatusFilterChange={onStatusFilterChange}
			/>
		);

		const cards = container.querySelectorAll('.ring-2');
		expect(cards.length).toBeGreaterThanOrEqual(1);
	});

	it('highlights "Pendientes" card when filter is "pending"', () => {
		const { container } = render(
			<StatsCardsWorks
				stats={stats}
				statusFilter="pending"
				onStatusFilterChange={onStatusFilterChange}
			/>
		);

		const cards = container.querySelectorAll('.ring-2');
		expect(cards.length).toBeGreaterThanOrEqual(1);
	});

	it('calls onStatusFilterChange with correct filter when clicked', () => {
		render(
			<StatsCardsWorks
				stats={stats}
				statusFilter="all"
				onStatusFilterChange={onStatusFilterChange}
			/>
		);

		fireEvent.click(screen.getByText('Pendientes'));
		expect(onStatusFilterChange).toHaveBeenCalledWith('pending');

		fireEvent.click(screen.getByText('En progreso'));
		expect(onStatusFilterChange).toHaveBeenCalledWith('in_progress');

		fireEvent.click(screen.getByText('En pausa'));
		expect(onStatusFilterChange).toHaveBeenCalledWith('paused');

		fireEvent.click(screen.getByText('Finalizadas'));
		expect(onStatusFilterChange).toHaveBeenCalledWith('completed');

		fireEvent.click(screen.getByText('Todas'));
		expect(onStatusFilterChange).toHaveBeenCalledWith('all');
	});
});
