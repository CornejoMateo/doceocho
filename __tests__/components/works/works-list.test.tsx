import { render, screen, fireEvent } from '@testing-library/react';
import { WorksList } from '@/components/business/works/works-list';
import { Work } from '@/lib/works/works';

jest.mock('@/hooks/clients/use-works-checklists', () => ({
	useWorkChecklists: () => ({
		workChecklists: {} as Record<number, boolean>,
		loadingChecklists: {} as Record<number, boolean>,
	}),
}));

jest.mock('@/lib/checklists/checklists', () => ({
	getChecklistsByWorkId: jest.fn().mockResolvedValue({ data: [], error: null }),
	createChecklist: jest.fn().mockResolvedValue({ error: null }),
}));

jest.mock('@/components/ui/popover', () => ({
	Popover: ({ children }: any) => <>{children}</>,
	PopoverTrigger: ({ children }: any) => <>{children}</>,
	PopoverContent: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/utils/formats-money', () => ({
	formatCurrency: (v: number | null | undefined) => `$${v || 0}`,
}));

const mockWorks: Work[] = Array.from({ length: 8 }, (_, i) => ({
	id: i + 1,
	name: `Obra pepito ${i + 1}`,
	address: `Calle ${i + 1}`,
	locality: 'CABA',
	status: i % 2 === 0 ? 'pending' : 'in_progress',
	architect: i % 2 === 0 ? 'Arq. Pérez' : '',
	furniture: '',
	created_at: '2024-06-15',
}));

const mockBalances = [
	{
		id: 1,
		created_at: '2024-06-20',
		balance_amount_ars: 50000,
		budget: {
			id: 10,
			created_at: '2024-05-01',
			amount_ars: 100000,
			amount_usd: 5000,
			number: 'BGT-001',
			type: 'COCINA',
			folder_budget: {
				id: 100,
				work_id: 1,
				work: { address: 'Calle 1', locality: 'CABA', name: 'Obra A' },
			},
		},
	},
	{
		id: 2,
		created_at: '2024-06-21',
		balance_amount_ars: 30000,
		budget: {
			id: 20,
			created_at: '2024-05-02',
			amount_ars: 200000,
			amount_usd: 10000,
			number: 'BGT-002',
			type: 'PLACAR',
			folder_budget: {
				id: 200,
				work_id: 1,
				work: { address: 'Calle 1', locality: 'CABA', name: 'Obra A' },
			},
		},
	},
	{
		id: 3,
		created_at: '2024-06-22',
		balance_amount_ars: 10000,
		budget: {
			id: 30,
			created_at: '2024-05-03',
			amount_ars: 50000,
			amount_usd: 2500,
			number: 'BGT-003',
			type: 'MUEBLE',
			folder_budget: {
				id: 300,
				work_id: 2,
				work: { address: 'Calle 2', locality: 'CABA', name: 'Obra B' },
			},
		},
	},
];

describe('WorksList', () => {
	const onDelete = jest.fn();
	const onWorkUpdated = jest.fn();
	const onCreateWork = jest.fn();
	const onUpdate = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders search input', () => {
		render(
			<WorksList
				works={mockWorks}
				onDelete={onDelete}
				onWorkUpdated={onWorkUpdated}
				onCreateWork={onCreateWork}
				onUpdate={onUpdate}
			/>
		);

		expect(
			screen.getByPlaceholderText('Buscar por dirección, arquitecto, zona, barrio o estado...')
		).toBeInTheDocument();
	});

	it('renders "Crear Obra" button when onCreateWork is provided', () => {
		render(
			<WorksList
				works={mockWorks}
				onDelete={onDelete}
				onWorkUpdated={onWorkUpdated}
				onCreateWork={onCreateWork}
				onUpdate={onUpdate}
			/>
		);

		expect(screen.getByText('Crear Obra')).toBeInTheDocument();
	});

	it('hides "Crear Obra" button when onCreateWork is not provided', () => {
		render(
			<WorksList
				works={mockWorks}
				onDelete={onDelete}
				onWorkUpdated={onWorkUpdated}
				onUpdate={onUpdate}
			/>
		);

		expect(screen.queryByText('Crear Obra')).not.toBeInTheDocument();
	});

	it('calls onCreateWork when button is clicked', () => {
		render(
			<WorksList
				works={mockWorks}
				onDelete={onDelete}
				onWorkUpdated={onWorkUpdated}
				onCreateWork={onCreateWork}
				onUpdate={onUpdate}
			/>
		);

		fireEvent.click(screen.getByText('Crear Obra'));
		expect(onCreateWork).toHaveBeenCalled();
	});

	it('renders work cards', () => {
		render(
			<WorksList
				works={mockWorks.slice(0, 3)}
				onDelete={onDelete}
				onWorkUpdated={onWorkUpdated}
				onUpdate={onUpdate}
			/>
		);

		expect(screen.getByText('Obra pepito 1')).toBeInTheDocument();
	});

	it('renders delete buttons when onDelete is provided', () => {
		render(
			<WorksList
				works={mockWorks.slice(0, 1)}
				onDelete={onDelete}
				onWorkUpdated={onWorkUpdated}
				onUpdate={onUpdate}
			/>
		);

		const trashButtons = screen.getAllByRole('button');
		expect(trashButtons.length).toBeGreaterThan(0);
	});

	it('opens delete dialog when trash icon is clicked', () => {
		render(
			<WorksList
				works={mockWorks.slice(0, 1)}
				onDelete={onDelete}
				onWorkUpdated={onWorkUpdated}
				onUpdate={onUpdate}
			/>
		);

		const buttons = screen.getAllByRole('button');
		const trashButton = buttons.find((b) => b.querySelector('svg.lucide-trash2') !== null);
		if (trashButton) {
			fireEvent.click(trashButton);
		}

		expect(screen.getByText('Eliminar obra')).toBeInTheDocument();
	});

	it('filters works by search term', () => {
		render(
			<WorksList
				works={mockWorks}
				onDelete={onDelete}
				onWorkUpdated={onWorkUpdated}
				onUpdate={onUpdate}
			/>
		);

		const searchInput = screen.getByPlaceholderText(
			'Buscar por dirección, arquitecto, zona, barrio o estado...'
		);
		fireEvent.change(searchInput, { target: { value: 'Calle 1' } });

		expect(screen.getByText('Calle 1')).toBeInTheDocument();
	});

	it('renders pagination when more than itemsPerPage works', () => {
		render(
			<WorksList
				works={mockWorks}
				onDelete={onDelete}
				onWorkUpdated={onWorkUpdated}
				onUpdate={onUpdate}
			/>
		);

		expect(screen.getByText('1')).toBeInTheDocument();
		expect(screen.getByText('2')).toBeInTheDocument();
	});

	it('renders status select for each work', () => {
		render(
			<WorksList
				works={mockWorks.slice(0, 1)}
				onDelete={onDelete}
				onWorkUpdated={onWorkUpdated}
				onUpdate={onUpdate}
			/>
		);

		const statusSelect = screen.getByRole('combobox');
		expect(statusSelect).toBeInTheDocument();
	});

	it('rendes "Crear Checklists" button for works without checklists', () => {
		render(
			<WorksList
				works={mockWorks.slice(0, 1)}
				onDelete={onDelete}
				onWorkUpdated={onWorkUpdated}
				onUpdate={onUpdate}
			/>
		);

		const createButtons = screen.getAllByText('Crear Checklists');
		expect(createButtons.length).toBeGreaterThan(0);
	});

	it('hides "Saldos" button when onOpenBalance is not provided', () => {
		render(
			<WorksList
				works={mockWorks.slice(0, 1)}
				onDelete={onDelete}
				onWorkUpdated={onWorkUpdated}
				onUpdate={onUpdate}
			/>
		);

		expect(screen.queryByText('Saldos')).not.toBeInTheDocument();
	});

	it('renders "Saldos" button when onOpenBalance is provided', () => {
		const onOpenBalance = jest.fn();
		render(
			<WorksList
				works={mockWorks.slice(0, 1)}
				balances={mockBalances as any}
				onDelete={onDelete}
				onWorkUpdated={onWorkUpdated}
				onUpdate={onUpdate}
				onOpenBalance={onOpenBalance}
			/>
		);

		expect(screen.getByText('Saldos')).toBeInTheDocument();
	});

	it('shows "No hay saldos asociados" when the work has no balances', () => {
		const onOpenBalance = jest.fn();
		render(
			<WorksList
				works={mockWorks.slice(0, 1)}
				balances={[]}
				onDelete={onDelete}
				onWorkUpdated={onWorkUpdated}
				onUpdate={onUpdate}
				onOpenBalance={onOpenBalance}
			/>
		);

		expect(screen.getByText('Saldos de la obra')).toBeInTheDocument();
		expect(screen.getByText('No hay saldos asociados')).toBeInTheDocument();
	});

	it('shows the balances associated with the work', () => {
		const onOpenBalance = jest.fn();
		render(
			<WorksList
				works={mockWorks.slice(0, 1)}
				balances={mockBalances as any}
				onDelete={onDelete}
				onWorkUpdated={onWorkUpdated}
				onUpdate={onUpdate}
				onOpenBalance={onOpenBalance}
			/>
		);

		expect(screen.getByText('BGT-001 · COCINA')).toBeInTheDocument();
		expect(screen.getByText('$100000')).toBeInTheDocument();
		expect(screen.getByText('BGT-002 · PLACAR')).toBeInTheDocument();
		expect(screen.getByText('$200000')).toBeInTheDocument();
	});

	it('calls onOpenBalance with workId and balanceId when a balance is clicked', () => {
		const onOpenBalance = jest.fn();
		render(
			<WorksList
				works={mockWorks.slice(0, 1)}
				balances={mockBalances as any}
				onDelete={onDelete}
				onWorkUpdated={onWorkUpdated}
				onUpdate={onUpdate}
				onOpenBalance={onOpenBalance}
			/>
		);

		fireEvent.click(screen.getByText('BGT-002 · PLACAR'));

		expect(onOpenBalance).toHaveBeenCalledWith(1, 2);
	});

	it('only shows balances of the displayed work', () => {
		const onOpenBalance = jest.fn();
		render(
			<WorksList
				works={mockWorks.slice(0, 1)}
				balances={mockBalances as any}
				onDelete={onDelete}
				onWorkUpdated={onWorkUpdated}
				onUpdate={onUpdate}
				onOpenBalance={onOpenBalance}
			/>
		);

		expect(screen.queryByText('BGT-003 · MUEBLE')).not.toBeInTheDocument();
		expect(screen.queryByText('$50000')).not.toBeInTheDocument();
	});
});
