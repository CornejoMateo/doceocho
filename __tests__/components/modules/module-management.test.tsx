import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModuleManagement } from '@/components/business/modules/module-management';
import { listModulesForCurrentMonth, deleteModule } from '@/lib/modules/modules';
import { useAuth } from '@/components/provider/auth-provider';
import { toast } from '@/components/ui/use-toast';

jest.mock('@/lib/modules/modules', () => ({
	listModulesForCurrentMonth: jest.fn(),
	deleteModule: jest.fn(),
}));

jest.mock('@/components/provider/auth-provider', () => ({
	useAuth: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => e?.message || 'Error desconocido',
}));

jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(),
}));

jest.mock('lucide-react', () => ({
	Plus: () => <span data-testid="plus-icon" />,
	Search: () => <span data-testid="search-icon" />,
	X: () => <span data-testid="x-icon" />,
}));

jest.mock('@/components/ui/select', () => ({
	Select: ({ children, value, onValueChange }: any) => (
		<select
			data-testid="select-native"
			value={value}
			onChange={(e) => onValueChange?.(e.target.value)}
		>
			{children}
		</select>
	),
	SelectTrigger: ({ children }: any) => <span>{children}</span>,
	SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
	SelectContent: ({ children }: any) => <>{children}</>,
	SelectItem: ({ children, value }: any) => (
		<option value={value} data-testid="select-option">
			{children}
		</option>
	),
}));

jest.mock('@/helpers/modules/modules-helper', () => ({
	getModuleWorkLabel: (m: any) => `Obra-${m.id}`,
	getModuleStatusLabel: (s: any) => s ?? 'not_send',
}));

jest.mock('@/components/business/modules/module-table', () => ({
	ModuleTable: ({ modules, isLoading, onRowClick, onEdit, onDelete, emptyText }: any) => (
		<div data-testid="module-table" data-count={modules.length}>
			{isLoading && <span data-testid="table-loading">loading</span>}
			{modules.length === 0 && !isLoading && emptyText && (
				<span data-testid="table-empty">{emptyText}</span>
			)}
			{modules.map((m: any) => (
				<div key={m.id} data-testid={`row-${m.id}`}>
					<button type="button" data-testid={`row-click-${m.id}`} onClick={() => onRowClick(m)}>
						{m.title}
					</button>
					<button type="button" data-testid={`row-edit-${m.id}`} onClick={() => onEdit(m)}>
						edit
					</button>
					<button type="button" data-testid={`row-delete-${m.id}`} onClick={() => onDelete(m)}>
						delete
					</button>
				</div>
			))}
		</div>
	),
}));

jest.mock('@/components/business/modules/module-form-modal', () => ({
	ModuleFormModal: ({ open, moduleToEdit }: any) =>
		open ? (
			<div data-testid="form-modal">
				<span data-testid="form-modal-target">{moduleToEdit ? moduleToEdit.title : 'create'}</span>
			</div>
		) : null,
}));

jest.mock('@/components/business/modules/module-details-modal', () => ({
	ModuleDetailsModal: ({ open, module }: any) =>
		open ? <div data-testid="details-modal">{module?.title}</div> : null,
}));

jest.mock('@/components/business/modules/load-more-modules-modal', () => ({
	LoadMoreModulesModal: ({ open }: any) => (open ? <div data-testid="load-more-modal" /> : null),
}));

jest.mock('@/components/ui/confirm-dialog', () => ({
	ConfirmDialog: ({ open, onConfirm, isLoading }: any) =>
		open ? (
			<div data-testid="confirm-dialog">
				<button type="button" data-testid="confirm-accept" onClick={onConfirm} disabled={isLoading}>
					confirm
				</button>
			</div>
		) : null,
}));

const MODULES = [
	{ id: 1, title: 'Fundaciones', status: 'approved' },
	{ id: 2, title: 'Estructura', status: 'pending' },
	{ id: 3, title: 'Techos', status: null },
];

const mockUseAuth = useAuth as jest.Mock;

beforeEach(() => {
	jest.clearAllMocks();
	mockUseAuth.mockReturnValue({
		user: { uid: 'user-1', username: 'admin', name: 'Admin', last_name: 'User', role: 'Admin' },
		loading: false,
		signIn: jest.fn(),
		signOutUser: jest.fn(),
	});
	(listModulesForCurrentMonth as jest.Mock).mockResolvedValue({ data: MODULES, error: null });
	(deleteModule as jest.Mock).mockResolvedValue({ data: null, error: null });
});

async function renderAndLoad() {
	render(<ModuleManagement />);
	await waitFor(() => {
		expect(screen.getByTestId('module-table')).toHaveAttribute('data-count', '3');
	});
}

describe('ModuleManagement', () => {
	it('loads and lists modules of the current month', async () => {
		await renderAndLoad();
		expect(screen.getByText('Módulos del mes actual')).toBeInTheDocument();
		expect(screen.getByText('3 módulo(s) registrado(s) este mes.')).toBeInTheDocument();
		expect(screen.getByTestId('row-1')).toBeInTheDocument();
	});

	it('shows a destructive toast when loading fails', async () => {
		(listModulesForCurrentMonth as jest.Mock).mockResolvedValue({
			data: null,
			error: { message: 'DB error' },
		});
		render(<ModuleManagement />);
		await waitFor(() => {
			expect(toast).toHaveBeenCalledWith(
				expect.objectContaining({
					variant: 'destructive',
					title: 'Error al cargar módulos',
				})
			);
		});
	});

	it('filters modules by search title', async () => {
		await renderAndLoad();
		const input = screen.getByPlaceholderText('Buscar por título, obra o descripción...');
		fireEvent.change(input, { target: { value: 'Estructura' } });
		expect(screen.getByTestId('module-table')).toHaveAttribute('data-count', '1');
		expect(screen.getByText('1 de 3 módulo(s) registrado(s) este mes.')).toBeInTheDocument();
	});

	it('filters modules by search on the work label', async () => {
		await renderAndLoad();
		const input = screen.getByPlaceholderText('Buscar por título, obra o descripción...');
		fireEvent.change(input, { target: { value: 'Obra-2' } });
		expect(screen.getByTestId('module-table')).toHaveAttribute('data-count', '1');
		expect(screen.getByTestId('row-2')).toBeInTheDocument();
	});

	it('filters modules by status', async () => {
		await renderAndLoad();
		fireEvent.change(screen.getByTestId('select-native'), { target: { value: 'approved' } });
		expect(screen.getByTestId('module-table')).toHaveAttribute('data-count', '1');
		expect(screen.getByTestId('row-1')).toBeInTheDocument();
	});

	it('treats a null status as not_send when filtering', async () => {
		await renderAndLoad();
		fireEvent.change(screen.getByTestId('select-native'), { target: { value: 'not_send' } });
		expect(screen.getByTestId('module-table')).toHaveAttribute('data-count', '1');
		expect(screen.getByTestId('row-3')).toBeInTheDocument();
	});

	it('shows empty message when filters match nothing', async () => {
		await renderAndLoad();
		const input = screen.getByPlaceholderText('Buscar por título, obra o descripción...');
		fireEvent.change(input, { target: { value: 'zzz' } });
		expect(screen.getByTestId('module-table')).toHaveAttribute('data-count', '0');
		expect(
			screen.getByText('No hay módulos que coincidan con los filtros aplicados.')
		).toBeInTheDocument();
	});

	it('clears filters with the Limpiar button', async () => {
		await renderAndLoad();
		const input = screen.getByPlaceholderText('Buscar por título, obra o descripción...');
		fireEvent.change(input, { target: { value: 'zzz' } });
		expect(screen.getByTestId('module-table')).toHaveAttribute('data-count', '0');
		fireEvent.click(screen.getByText('Limpiar'));
		expect(screen.getByTestId('module-table')).toHaveAttribute('data-count', '3');
		expect(screen.queryByText('Limpiar')).not.toBeInTheDocument();
	});

	it('opens the create form when clicking Nuevo módulo', async () => {
		await renderAndLoad();
		fireEvent.click(screen.getByText('Nuevo módulo'));
		expect(screen.getByTestId('form-modal')).toBeInTheDocument();
		expect(screen.getByTestId('form-modal-target')).toHaveTextContent('create');
	});

	it('opens module details when clicking a row', async () => {
		await renderAndLoad();
		fireEvent.click(screen.getByTestId('row-click-1'));
		expect(screen.getByTestId('details-modal')).toHaveTextContent('Fundaciones');
	});

	it('opens the edit form with the module when clicking edit', async () => {
		const onRowClick = jest.fn();
		await renderAndLoad();
		fireEvent.click(screen.getByTestId('row-edit-2'));
		expect(screen.getByTestId('form-modal')).toBeInTheDocument();
		expect(screen.getByTestId('form-modal-target')).toHaveTextContent('Estructura');
		expect(onRowClick).not.toHaveBeenCalled();
	});

	it('deletes a module after confirming and reloads the list', async () => {
		await renderAndLoad();
		fireEvent.click(screen.getByTestId('row-delete-1'));
		expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
		fireEvent.click(screen.getByTestId('confirm-accept'));

		await waitFor(() => {
			expect(deleteModule).toHaveBeenCalledWith(1);
			expect(listModulesForCurrentMonth).toHaveBeenCalledTimes(2);
		});
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Módulo eliminado',
			})
		);
	});

	it('shows an error toast when deletion fails and does not reload', async () => {
		(deleteModule as jest.Mock).mockResolvedValue({ data: null, error: { message: 'nope' } });
		await renderAndLoad();
		fireEvent.click(screen.getByTestId('row-delete-1'));
		fireEvent.click(screen.getByTestId('confirm-accept'));

		await waitFor(() => {
			expect(deleteModule).toHaveBeenCalledWith(1);
			expect(toast).toHaveBeenCalledWith(
				expect.objectContaining({
					variant: 'destructive',
					title: 'Error al eliminar el módulo',
				})
			);
		});
		expect(listModulesForCurrentMonth).toHaveBeenCalledTimes(1);
	});

	it('opens the load more modal via Cargar más módulos', async () => {
		await renderAndLoad();
		expect(screen.queryByTestId('load-more-modal')).not.toBeInTheDocument();
		fireEvent.click(screen.getByText('Cargar más módulos'));
		expect(screen.getByTestId('load-more-modal')).toBeInTheDocument();
	});
});
