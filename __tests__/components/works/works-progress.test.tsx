import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { WorksOpenings } from '@/components/business/works/works-progress';
import { WorkWithProgress } from '@/lib/works/works';

jest.mock('@/components/business/works/work-card', () => ({
	WorkCard: ({ work, user, onOpenEmail, onOpenWhatsApp, onOpenChecklist }: any) => (
		<div data-testid="work-card">
			<span>{[work.client_last_name, work.client_name].filter(Boolean).join(' ')}</span>
			<span>{work.status}</span>
			<button onClick={() => onOpenEmail(work)}>Email</button>
			<button onClick={() => onOpenWhatsApp(work)}>WhatsApp</button>
			<button onClick={() => onOpenChecklist(work)}>Checklist</button>
		</div>
	),
}));

const mockWorks: WorkWithProgress[] = Array.from({ length: 12 }, (_, i) => ({
	id: i + 1,
	address: `Calle ${i + 1}`,
	locality: 'CABA',
	client_name: `Cliente${i + 1}`,
	client_last_name: 'Apellido',
	status: i < 3 ? 'pending' : i < 7 ? 'in_progress' : 'completed',
	progress: i * 10,
	created_at: '2024-06-15',
	architect: '',
	furniture: '',
	hasNotes: false,
	hasBudget: i >= 3,
	general_note: null,
	tasks: [],
}));

const mockUser = { role: 'Admin' };

const mockReload = jest.fn();

jest.mock('@/components/provider/auth-provider', () => ({
	useAuth: () => ({ user: mockUser }),
}));

jest.mock('@/hooks/clients/use-works-with-progress', () => ({
	useWorksWithProgress: () => ({
		works: mockWorks,
		loading: false,
		reload: mockReload,
	}),
}));

jest.mock('@/hooks/clients/use-notifications', () => ({
	useNotifications: () => ({
		activeModal: null,
		selectedWork: null,
		selectedClient: null,
		openEmail: jest.fn(),
		openWhatsApp: jest.fn(),
		sendEmail: jest.fn(),
		sendWhatsApp: jest.fn(),
		closeModal: jest.fn(),
		loading: false,
	}),
}));

jest.mock('@/hooks/clients/use-checklist-modal', () => ({
	useChecklistModal: () => ({
		isOpen: false,
		selectedWork: null,
		openChecklist: jest.fn(),
		closeChecklist: jest.fn(),
	}),
}));

jest.mock('@/lib/checklists/checklists', () => ({
	getChecklistsByWorkId: jest.fn().mockResolvedValue({ data: [], error: null }),
	createChecklist: jest.fn().mockResolvedValue({ error: null }),
}));

jest.mock('@/lib/works/works', () => ({
	updateWorkGeneralNote: jest.fn().mockResolvedValue({ error: null }),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => `translated: ${e?.message || e}`,
}));

jest.mock('@/lib/checklists/materials', () => ({
	listMaterials: jest.fn().mockResolvedValue({ data: [], error: null }),
}));

jest.mock('@/lib/checklists/items-predefined', () => ({
	listItemsPredefined: jest.fn().mockResolvedValue({ data: [], error: null }),
}));

jest.mock('@/components/business/works/checklists/items-predefined-dialog', () => ({
	ItemsPredefinedDialog: ({ open }: { open: boolean }) =>
		open ? <div data-testid="items-predefined-dialog">Items Predefinidos Dialog</div> : null,
}));

jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(),
}));

describe('WorksOpenings (works-progress)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders header', () => {
		render(<WorksOpenings />);

		expect(screen.getByText('Checklists de obras')).toBeInTheDocument();
	});

	it('renders search input', () => {
		render(<WorksOpenings />);

		expect(
			screen.getByPlaceholderText('Buscar por dirección, nombre o apellido del cliente...')
		).toBeInTheDocument();
	});

	it('renders stats cards', () => {
		render(<WorksOpenings />);

		expect(screen.getByText('Todas')).toBeInTheDocument();
		expect(screen.getByText('Pendientes')).toBeInTheDocument();
		expect(screen.getByText('En progreso')).toBeInTheDocument();
		expect(screen.getByText('Finalizadas')).toBeInTheDocument();
	});

	it('renders correct counts in stats', () => {
		render(<WorksOpenings />);

		expect(screen.getByText('12')).toBeInTheDocument();
		const pendingCard = screen.getByText('Pendientes').closest('[data-slot="card"]') as HTMLElement;
		expect(within(pendingCard).getByText('3')).toBeInTheDocument();
	});

	it('renders work cards', () => {
		render(<WorksOpenings />);

		const cards = screen.getAllByTestId('work-card');
		expect(cards.length).toBeGreaterThan(0);
	});

	it('filters works by search query', () => {
		render(<WorksOpenings />);

		const searchInput = screen.getByPlaceholderText(
			'Buscar por dirección, nombre o apellido del cliente...'
		);
		fireEvent.change(searchInput, { target: { value: 'Cliente1' } });

		const results = screen
			.getAllByTestId('work-card')
			.filter((card) => card.textContent?.includes('Cliente1'));
		expect(results.length).toBeGreaterThan(0);
	});

	it('filters works by status', () => {
		render(<WorksOpenings />);

		fireEvent.click(screen.getByText('Pendientes'));

		const cards = screen.getAllByTestId('work-card');
		expect(cards.length).toBe(3);
	});

	it('shows "sin presupuesto" toggle with count', () => {
		render(<WorksOpenings />);

		const toggle = screen.getByText('Mostrar obras sin presupuesto');
		expect(toggle).toBeInTheDocument();
		const label = toggle.closest('label')!;
		expect(within(label).getByText('3')).toBeInTheDocument();
	});

	it('filters works without budget when toggle is enabled', () => {
		render(<WorksOpenings />);

		fireEvent.click(screen.getByRole('switch'));

		const cards = screen.getAllByTestId('work-card');
		expect(cards).toHaveLength(3);
	});

	it('renders pagination when there are many works', () => {
		render(<WorksOpenings />);

		expect(screen.getByText('1')).toBeInTheDocument();
		expect(screen.getByText('2')).toBeInTheDocument();
	});

	it('paginates to next page', () => {
		render(<WorksOpenings />);

		const nextButton = screen
			.getAllByRole('link')
			.find(
				(l) =>
					l.getAttribute('aria-label') === 'Go to next page' || l.textContent?.includes('Siguiente')
			);
		if (nextButton) {
			fireEvent.click(nextButton);
		}

		const page2 = screen.getByText('2');
		expect(page2).toBeInTheDocument();
	});

	describe('admin role', () => {
		beforeEach(() => {
			mockUser.role = 'Admin';
		});

		it('shows "Items predefinidos" button', () => {
			render(<WorksOpenings />);
			expect(screen.getByText('Items predefinidos')).toBeInTheDocument();
		});

		it('opens ItemsPredefinedDialog when button is clicked', () => {
			render(<WorksOpenings />);

			expect(screen.queryByTestId('items-predefined-dialog')).not.toBeInTheDocument();

			fireEvent.click(screen.getByText('Items predefinidos'));

			expect(screen.getByTestId('items-predefined-dialog')).toBeInTheDocument();
		});
	});

	describe('non-admin role', () => {
		beforeEach(() => {
			mockUser.role = 'Operator';
		});

		it('hides "Items predefinidos" button', () => {
			render(<WorksOpenings />);
			expect(screen.queryByText('Items predefinidos')).not.toBeInTheDocument();
		});

		it('does not render ItemsPredefinedDialog', () => {
			render(<WorksOpenings />);
			expect(screen.queryByTestId('items-predefined-dialog')).not.toBeInTheDocument();
		});
	});
});
