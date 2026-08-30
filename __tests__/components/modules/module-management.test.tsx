import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModuleManagement } from '@/components/business/modules/module-management';
import {
	listModulesForCurrentMonth,
	listModulesPendingRejected,
	deleteModule,
	updateModule,
} from '@/lib/modules/modules';
import { useAuth } from '@/components/provider/auth-provider';
import { toast } from '@/components/ui/use-toast';

jest.mock('@/lib/modules/modules', () => ({
	listModulesForCurrentMonth: jest.fn(),
	listModulesPendingRejected: jest.fn(),
	deleteModule: jest.fn(),
	updateModule: jest.fn(),
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
	ChevronDown: () => <span data-testid="chevron-down-icon" />,
	ChevronUp: () => <span data-testid="chevron-up-icon" />,
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
	ModuleTable: ({
		modules,
		isLoading,
		showUser,
		onRowClick,
		onEdit,
		onDelete,
		onSend,
		emptyText,
	}: any) => (
		<div
			data-testid="module-table"
			data-count={modules.length}
			data-show-user={showUser ? 'true' : 'false'}
		>
			{isLoading && <span data-testid="table-loading">loading</span>}
			{modules.length === 0 && !isLoading && emptyText && (
				<span data-testid="table-empty">{emptyText}</span>
			)}
			{modules.map((m: any) => (
				<div key={m.id} data-testid={`row-${m.id}`}>
					<button type="button" data-testid={`row-click-${m.id}`} onClick={() => onRowClick(m)}>
						{m.title}
					</button>
					{(m.status === 'not_send' || m.status === null) && (
						<button type="button" data-testid={`row-send-${m.id}`} onClick={() => onSend(m)}>
							send
						</button>
					)}
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
	LoadMoreModulesModal: ({ open, users, user }: any) =>
		open ? (
			<div
				data-testid="load-more-modal"
				data-users-count={users?.length ?? 0}
				data-user-uid={user?.uid ?? 'null'}
			/>
		) : null,
}));

jest.mock('@/components/ui/confirm-dialog', () => ({
	ConfirmDialog: ({ open, title, description, onConfirm, isLoading }: any) =>
		open ? (
			<div data-testid="confirm-dialog">
				<div>{title}</div>
				<div>{description}</div>
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

const PENDING_MODULES = [
	{ id: 11, title: 'Columnas', status: 'pending' },
	{ id: 12, title: 'Cubierta', status: 'rejected' },
];

const mockUseAuth = useAuth as jest.Mock;

beforeEach(() => {
	jest.clearAllMocks();
	mockUseAuth.mockReturnValue({
		user: { uid: 'user-1', username: 'mauri', name: 'Mauri', last_name: 'Taller', role: 'Taller' },
		loading: false,
		signIn: jest.fn(),
		signOutUser: jest.fn(),
	});
	(listModulesForCurrentMonth as jest.Mock).mockResolvedValue({ data: MODULES, error: null });
	(listModulesPendingRejected as jest.Mock).mockResolvedValue({
		data: PENDING_MODULES,
		error: null,
	});
	(deleteModule as jest.Mock).mockResolvedValue({ data: null, error: null });
	(updateModule as jest.Mock).mockResolvedValue({ data: null, error: null });
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
		expect(screen.getByTestId('module-table')).toHaveAttribute('data-show-user', 'false');
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
		await renderAndLoad();
		fireEvent.click(screen.getByTestId('row-edit-2'));
		expect(screen.getByTestId('form-modal')).toBeInTheDocument();
		expect(screen.getByTestId('form-modal-target')).toHaveTextContent('Estructura');
		expect(screen.queryByTestId('details-modal')).not.toBeInTheDocument();
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

	it('sends a module to review after confirming', async () => {
		await renderAndLoad();
		expect(screen.queryByTestId('row-send-1')).not.toBeInTheDocument();
		expect(screen.queryByTestId('row-send-2')).not.toBeInTheDocument();

		fireEvent.click(screen.getByTestId('row-send-3'));
		expect(screen.getByText('¿Deseas enviar este módulo a revisión?')).toBeInTheDocument();
		fireEvent.click(screen.getByTestId('confirm-accept'));

		await waitFor(() => {
			expect(updateModule).toHaveBeenCalledWith(3, { status: 'pending' });
			expect(listModulesForCurrentMonth).toHaveBeenCalledTimes(2);
		});
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Módulo enviado a revisión' })
		);
	});

	it('shows an error toast when sending fails and does not reload', async () => {
		(updateModule as jest.Mock).mockResolvedValue({ data: null, error: { message: 'nope' } });
		await renderAndLoad();
		fireEvent.click(screen.getByTestId('row-send-3'));
		fireEvent.click(screen.getByTestId('confirm-accept'));

		await waitFor(() => {
			expect(updateModule).toHaveBeenCalledWith(3, { status: 'pending' });
			expect(toast).toHaveBeenCalledWith(
				expect.objectContaining({
					variant: 'destructive',
					title: 'Error al enviar el módulo',
				})
			);
		});
		expect(listModulesForCurrentMonth).toHaveBeenCalledTimes(1);
	});

	it('opens the load more modal via Cargar más módulos', async () => {
		await renderAndLoad();
		expect(screen.queryByTestId('load-more-modal')).not.toBeInTheDocument();
		fireEvent.click(screen.getByText('Cargar más módulos'));
		const modal = screen.getByTestId('load-more-modal');
		expect(modal).toBeInTheDocument();
		expect(modal).toHaveAttribute('data-user-uid', 'user-1');
	});
});

describe('ModuleManagement admin', () => {
	beforeEach(() => {
		mockUseAuth.mockReturnValue({
			user: {
				uid: 'admin-1',
				username: 'admin',
				name: 'Admin',
				last_name: 'User',
				role: 'Admin',
			},
			loading: false,
			signIn: jest.fn(),
			signOutUser: jest.fn(),
		});
	});

	async function renderAndLoadPending() {
		render(<ModuleManagement />);
		await waitFor(() => {
			expect(screen.getByTestId('module-table')).toHaveAttribute('data-count', '2');
		});
	}

	it('shows pending and rejected modules in the review table and never lists the month modules', async () => {
		await renderAndLoadPending();

		expect(screen.getByText('Listado de módulos')).toBeInTheDocument();
		expect(screen.getByText('2 módulo(s) pendiente(s) de revisión.')).toBeInTheDocument();
		expect(screen.getByTestId('row-11')).toBeInTheDocument();
		expect(screen.getByTestId('row-12')).toBeInTheDocument();
		expect(screen.getByTestId('module-table')).toHaveAttribute('data-show-user', 'true');

		expect(listModulesPendingRejected).toHaveBeenCalledTimes(1);
		expect(listModulesForCurrentMonth).not.toHaveBeenCalled();
		expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument();

		fireEvent.click(screen.getByText('Ver módulos del mes actual'));
		expect(listModulesForCurrentMonth).toHaveBeenCalledTimes(1);
		expect(screen.queryByTestId('chevron-down-icon')).not.toBeInTheDocument();
		expect(screen.getByTestId('chevron-up-icon')).toBeInTheDocument();
	});

	it('hides the status filter for admins', async () => {
		await renderAndLoadPending();
		expect(screen.queryByTestId('select-native')).not.toBeInTheDocument();
		expect(
			screen.getByPlaceholderText('Buscar por título, obra o descripción...')
		).toBeInTheDocument();
	});

	it('filters the review list by search', async () => {
		await renderAndLoadPending();
		const input = screen.getByPlaceholderText('Buscar por título, obra o descripción...');
		fireEvent.change(input, { target: { value: 'Cubierta' } });
		expect(screen.getByTestId('module-table')).toHaveAttribute('data-count', '1');
		expect(screen.getByTestId('row-12')).toBeInTheDocument();
		expect(screen.getByText('1 de 2 módulo(s) pendiente(s) de revisión.')).toBeInTheDocument();
	});

	it('shows the month table only when the section is opened, with all month modules', async () => {
		await renderAndLoadPending();
		expect(
			screen.queryByRole('heading', { level: 3, name: 'Módulos del mes actual' })
		).not.toBeInTheDocument();

		fireEvent.click(screen.getByText('Ver módulos del mes actual'));

		expect(screen.getByText('Módulos del mes actual')).toBeInTheDocument();
		expect(await screen.findByText('3 módulo(s) registrado(s) este mes.')).toBeInTheDocument();
		expect(screen.getAllByTestId('module-table')).toHaveLength(2);
		const monthTable = screen.getAllByTestId('module-table')[1];
		expect(monthTable).toHaveAttribute('data-count', '3');
		expect(monthTable).toHaveAttribute('data-show-user', 'true');
		expect(monthTable.querySelector('[data-testid="row-3"]')).toBeInTheDocument();
		expect(listModulesForCurrentMonth).toHaveBeenCalledTimes(1);
	});

	it('opens the load more modal from inside the month section', async () => {
		await renderAndLoadPending();
		expect(screen.queryByTestId('load-more-modal')).not.toBeInTheDocument();

		fireEvent.click(screen.getByText('Ver módulos del mes actual'));
		await screen.findByText('3 módulo(s) registrado(s) este mes.');

		fireEvent.click(screen.getByText('Cargar más módulos por usuario, año y mes'));
		const modal = screen.getByTestId('load-more-modal');
		expect(modal).toBeInTheDocument();
		expect(modal).toHaveAttribute('data-user-uid', 'null');
	});

	it('reloads the review list after deleting a module and leaves the month list untouched while closed', async () => {
		await renderAndLoadPending();
		fireEvent.click(screen.getByTestId('row-delete-11'));
		fireEvent.click(screen.getByTestId('confirm-accept'));

		await waitFor(() => {
			expect(deleteModule).toHaveBeenCalledWith(11);
			expect(listModulesPendingRejected).toHaveBeenCalledTimes(2);
		});
		expect(listModulesForCurrentMonth).not.toHaveBeenCalled();
	});

	it('does not show send buttons for pending or rejected modules in the review list', async () => {
		await renderAndLoadPending();
		expect(screen.queryByTestId('row-send-11')).not.toBeInTheDocument();
		expect(screen.queryByTestId('row-send-12')).not.toBeInTheDocument();
	});
});
