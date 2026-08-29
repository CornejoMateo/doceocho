import { render, screen, fireEvent } from '@testing-library/react';
import { ModuleTable } from '@/components/business/modules/module-table';

jest.mock('lucide-react', () => ({
	Loader2: () => <span data-testid="loader" />,
	Pencil: () => <span data-testid="edit-icon" />,
	Trash2: () => <span data-testid="delete-icon" />,
}));

jest.mock('@/helpers/modules/modules-helper', () => ({
	getModuleWorkLabel: (m: any) => m?.works?.name || m?.work_name || 'Sin obra',
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

	it('renders module rows with title, work, date and status', () => {
		render(<ModuleTable {...defaultProps} />);
		expect(screen.getByText('Fundaciones')).toBeInTheDocument();
		expect(screen.getByText('Obra Centro')).toBeInTheDocument();
		expect(screen.getByText('Estructura')).toBeInTheDocument();
		expect(screen.getByText('Obra Norte')).toBeInTheDocument();
		expect(screen.getAllByTestId('badge')).toHaveLength(2);
		expect(screen.getAllByText('28/08/2026')).toHaveLength(2);
	});

	it('calls onRowClick when clicking a row', () => {
		render(<ModuleTable {...defaultProps} />);
		fireEvent.click(screen.getByText('Fundaciones'));
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
});
