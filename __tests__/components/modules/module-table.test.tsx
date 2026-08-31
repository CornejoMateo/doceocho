import { render, screen, fireEvent, within } from '@testing-library/react';
import { ModuleTable } from '@/components/business/modules/module-table';

jest.mock('lucide-react', () => ({
	Loader2: () => <span data-testid="loader" />,
	Pencil: () => <span data-testid="edit-icon" />,
	Trash2: () => <span data-testid="delete-icon" />,
}));

jest.mock('@/helpers/modules/modules-helper', () => ({
	getModuleWorkLabel: (m: any) => m?.works?.name || m?.work_name || 'Sin obra',
	getModuleUserLabel: (m: any) => {
		const u = m?.users;
		if (!u) return 'Sin usuario';
		const fullName = [u.name, u.last_name].filter(Boolean).join(' ').trim();
		return fullName || u.username || 'Sin usuario';
	},
	ModuleStatusBadge: ({ status }: any) => <span data-testid="badge">{status ?? 'not_send'}</span>,
}));

jest.mock('@/utils/format-date', () => ({
	formatCreatedAt: () => '28/08/2026',
}));

const modules = [
	{
		id: 1,
		title: 'Fundaciones',
		status: 'approved',
		created_at: '2026-08-28T12:00:00Z',
		works: { name: 'Obra Centro', locality: 'Centro' },
	},
	{
		id: 2,
		title: 'Estructura',
		status: null,
		created_at: '2026-08-27T12:00:00Z',
		works: null,
		work_name: 'Obra Norte',
	},
];

const defaultProps = {
	modules: modules as any[],
	isLoading: false,
	onRowClick: jest.fn(),
	onEdit: jest.fn(),
	onDelete: jest.fn(),
	onSend: jest.fn(),
};

describe('ModuleTable', () => {
	it('shows loading state', () => {
		render(<ModuleTable {...defaultProps} isLoading modules={[]} />);
		expect(screen.getByTestId('loader')).toBeInTheDocument();
	});

	it('shows default empty message when there are no modules', () => {
		render(<ModuleTable {...defaultProps} modules={[]} />);
		expect(screen.getByText('Todavía no hay módulos registrados este mes.')).toBeInTheDocument();
	});

	it('shows custom empty message when provided', () => {
		render(
			<ModuleTable
				{...defaultProps}
				modules={[]}
				emptyText="No hay módulos que coincidan con los filtros aplicados."
			/>
		);
		expect(
			screen.getByText('No hay módulos que coincidan con los filtros aplicados.')
		).toBeInTheDocument();
	});

	it('renders desktop module rows with title, work, date and status', () => {
		render(<ModuleTable {...defaultProps} />);
		const desktop = screen.getByTestId('module-table-desktop');
		expect(within(desktop).getByText('Fundaciones')).toBeInTheDocument();
		expect(within(desktop).getByText('Obra Centro')).toBeInTheDocument();
		expect(within(desktop).getByText('Estructura')).toBeInTheDocument();
		expect(within(desktop).getByText('Obra Norte')).toBeInTheDocument();
		expect(within(desktop).getAllByTestId('badge')).toHaveLength(2);
		expect(within(desktop).getAllByText('28/08/2026')).toHaveLength(2);
	});

	it('renders mobile cards with title, work, date and status', () => {
		render(<ModuleTable {...defaultProps} />);
		const mobile = screen.getByTestId('module-table-mobile');
		expect(within(mobile).getByText('Fundaciones')).toBeInTheDocument();
		expect(within(mobile).getByText('Obra Centro')).toBeInTheDocument();
		expect(within(mobile).getByText('Estructura')).toBeInTheDocument();
		expect(within(mobile).getByText('Obra Norte')).toBeInTheDocument();
		expect(within(mobile).getAllByTestId('badge')).toHaveLength(2);
		expect(within(mobile).getAllByText('28/08/2026')).toHaveLength(2);
	});

	it('calls onRowClick when clicking a desktop row', () => {
		render(<ModuleTable {...defaultProps} />);
		const desktop = screen.getByTestId('module-table-desktop');
		fireEvent.click(within(desktop).getByText('Fundaciones'));
		expect(defaultProps.onRowClick).toHaveBeenCalledWith(modules[0]);
	});

	it('calls onRowClick when clicking a mobile card', () => {
		render(<ModuleTable {...defaultProps} />);
		const mobile = screen.getByTestId('module-table-mobile');
		fireEvent.click(within(mobile).getByText('Fundaciones'));
		expect(defaultProps.onRowClick).toHaveBeenCalledWith(modules[0]);
	});

	it('calls onEdit when clicking edit and stops row propagation', () => {
		const onRowClick = jest.fn();
		const onEdit = jest.fn();
		render(<ModuleTable {...defaultProps} onRowClick={onRowClick} onEdit={onEdit} />);
		fireEvent.click(screen.getAllByTestId('edit-icon')[0]);
		expect(onEdit).toHaveBeenCalledWith(modules[0]);
		expect(onRowClick).not.toHaveBeenCalled();
	});

	it('calls onDelete when clicking delete and stops row propagation', () => {
		const onRowClick = jest.fn();
		const onDelete = jest.fn();
		render(<ModuleTable {...defaultProps} onRowClick={onRowClick} onDelete={onDelete} />);
		fireEvent.click(screen.getAllByTestId('delete-icon')[0]);
		expect(onDelete).toHaveBeenCalledWith(modules[0]);
		expect(onRowClick).not.toHaveBeenCalled();
	});

	it('calls onSend when clicking send and stops row propagation', () => {
		const onRowClick = jest.fn();
		const onSend = jest.fn();
		render(<ModuleTable {...defaultProps} onRowClick={onRowClick} onSend={onSend} />);
		fireEvent.click(screen.getAllByRole('button', { name: 'Solicitar aprobación' })[0]);
		expect(onSend).toHaveBeenCalledWith(modules[1]);
		expect(onRowClick).not.toHaveBeenCalled();
	});

	it('hides the Usuario column by default', () => {
		render(<ModuleTable {...defaultProps} />);
		expect(screen.queryByText('Usuario')).not.toBeInTheDocument();
	});

	it('shows the Usuario column on desktop when showUser is enabled', () => {
		const withUser = [
			{ ...modules[0], users: { name: 'Juan', last_name: 'Pérez', username: 'jperez' } },
			{ ...modules[1], users: { username: 'cnorte' } },
		];
		render(<ModuleTable {...defaultProps} modules={withUser as any} showUser />);
		const desktop = screen.getByTestId('module-table-desktop');
		expect(within(desktop).getByText('Usuario')).toBeInTheDocument();
		expect(within(desktop).getByText('Juan Pérez')).toBeInTheDocument();
		expect(within(desktop).getByText('cnorte')).toBeInTheDocument();
	});

	it('shows the sender name on mobile cards when showUser is enabled', () => {
		const withUser = [
			{ ...modules[0], users: { name: 'Juan', last_name: 'Pérez', username: 'jperez' } },
		];
		render(<ModuleTable {...defaultProps} modules={withUser as any} showUser />);
		const mobile = screen.getByTestId('module-table-mobile');
		expect(within(mobile).getByText('Enviado por: Juan Pérez')).toBeInTheDocument();
	});

	it('falls back to username when the user has no name', () => {
		const withUser = [{ ...modules[0], users: { username: 'jperez' } }];
		render(<ModuleTable {...defaultProps} modules={withUser as any} showUser />);
		const desktop = screen.getByTestId('module-table-desktop');
		expect(within(desktop).getByText('jperez')).toBeInTheDocument();
	});

	it('renders the send button only for modules not yet sent (not_send or null)', () => {
		const gated = [
			{ id: 1, status: 'approved', title: 'A', created_at: '2026-08-01T12:00:00Z' },
			{ id: 2, status: 'pending', title: 'P', created_at: '2026-08-01T12:00:00Z' },
			{ id: 3, status: null, title: 'N', created_at: '2026-08-01T12:00:00Z' },
			{ id: 4, status: 'rejected', title: 'R', created_at: '2026-08-01T12:00:00Z' },
			{ id: 5, status: 'not_send', title: 'S', created_at: '2026-08-01T12:00:00Z' },
		];
		render(<ModuleTable {...defaultProps} modules={gated as any} />);

		expect(
			within(screen.getByTestId('module-table-desktop')).getAllByRole('button', {
				name: 'Solicitar aprobación',
			})
		).toHaveLength(2);
		expect(
			within(screen.getByTestId('module-table-mobile')).getAllByRole('button', {
				name: 'Solicitar aprobación',
			})
		).toHaveLength(2);
		expect(defaultProps.onSend).not.toHaveBeenCalled();
	});
});
