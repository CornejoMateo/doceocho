import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoadMoreModulesModal } from '@/components/business/modules/load-more-modules-modal';
import { getUserModulesForMonth } from '@/lib/modules/modules';

jest.mock('@/lib/modules/modules', () => ({
	getUserModulesForMonth: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => e?.message || 'Error desconocido',
}));

jest.mock('@/components/ui/spinner', () => ({
	Spinner: (props: any) => <div data-testid="spinner" {...props} />,
}));

jest.mock('@/components/ui/dialog', () => ({
	Dialog: ({ open, children }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
	DialogContent: ({ children, className }: any) => (
		<div data-testid="dialog-content" className={className}>
			{children}
		</div>
	),
	DialogHeader: ({ children }: any) => <div>{children}</div>,
	DialogTitle: ({ children }: any) => <h2>{children}</h2>,
	DialogDescription: ({ children }: any) => <p>{children}</p>,
	DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
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
	SelectTrigger: ({ children, id }: any) => <span data-testid={id}>{children}</span>,
	SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
	SelectContent: ({ children }: any) => <>{children}</>,
	SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, disabled, variant, type, ...props }: any) => (
		<button onClick={onClick} disabled={disabled} data-variant={variant} type={type} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/label', () => ({
	Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

jest.mock('@/utils/format-date', () => ({
	formatCreatedAt: (d: string) => d || 'N/A',
	getLocalDate: () => '2026-08-21',
}));

jest.mock('@/utils/formats-money', () => ({
	formatCurrency: (amount: number | null | undefined) => `$${amount ?? 0}`,
}));

jest.mock('@/helpers/modules/modules-helper', () => ({
	getModuleWorkLabel: (m: any) => m?.work_name || 'Sin obra',
	ModuleStatusBadge: ({ status }: any) => <span data-testid="badge">{status ?? 'not_send'}</span>,
}));

jest.mock('@/components/business/modules/module-details-modal', () => ({
	ModuleDetailsModal: ({ open, module, onOpenChange }: any) =>
		open ? (
			<div data-testid="module-details-modal">
				<button type="button" data-testid="close-details" onClick={() => onOpenChange(false)}>
					close
				</button>
				<span>{module?.title}</span>
			</div>
		) : null,
}));

beforeEach(() => {
	(getUserModulesForMonth as jest.Mock).mockReset();
});

const sampleModules = [
	{
		id: 1,
		title: 'Fundaciones',
		status: 'approved',
		amount: 100,
		created_at: '2026-08-21T10:00:00Z',
		work_name: 'Obra Centro',
	},
	{
		id: 2,
		title: 'Estructura',
		status: null,
		amount: 250,
		created_at: '2026-08-20T10:00:00Z',
		work_name: null,
	},
];

describe('LoadMoreModulesModal', () => {
	const defaultProps = {
		open: true,
		onOpenChange: jest.fn(),
		users: [],
		user: null,
	};

	it('does not render when closed', () => {
		render(<LoadMoreModulesModal {...defaultProps} open={false} />);
		expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
	});

	it('renders when open', () => {
		render(<LoadMoreModulesModal {...defaultProps} />);
		expect(screen.getByTestId('dialog')).toBeInTheDocument();
		expect(screen.getByText('Cargar más módulos')).toBeInTheDocument();
	});

	it('shows year and month selects', () => {
		render(<LoadMoreModulesModal {...defaultProps} />);
		expect(screen.getByText('Año')).toBeInTheDocument();
		expect(screen.getByText('Mes')).toBeInTheDocument();
		expect(screen.getByText('2026')).toBeInTheDocument();
	});

	it('shows user select in admin mode', () => {
		render(<LoadMoreModulesModal {...defaultProps} />);
		expect(screen.getByText('Usuario')).toBeInTheDocument();
	});

	it('hides user select in user mode', () => {
		render(<LoadMoreModulesModal {...defaultProps} user={{ uid: 'user-1' } as any} />);
		expect(screen.queryByText('Usuario')).not.toBeInTheDocument();
	});

	it('"Cerrar" button has type="button"', () => {
		render(<LoadMoreModulesModal {...defaultProps} />);
		expect(screen.getByText('Cerrar')).toHaveAttribute('type', 'button');
	});

	it('"Cargar" button (not "Aceptar") has type="button"', () => {
		render(<LoadMoreModulesModal {...defaultProps} />);
		const loadBtn = screen.getByText('Cargar');
		expect(loadBtn).toHaveAttribute('type', 'button');
		expect(screen.queryByText('Aceptar')).not.toBeInTheDocument();
	});

	it('disables Cargar when no user is selected in admin mode', () => {
		render(<LoadMoreModulesModal {...defaultProps} />);
		expect(screen.getByText('Cargar')).toBeDisabled();
	});

	it('loads modules for the session user when clicking Cargar', async () => {
		(getUserModulesForMonth as jest.Mock).mockResolvedValue({
			data: sampleModules,
			error: null,
		});
		render(<LoadMoreModulesModal {...defaultProps} user={{ uid: 'user-1' } as any} />);
		fireEvent.click(screen.getByText('Cargar'));
		await waitFor(() => {
			expect(getUserModulesForMonth).toHaveBeenCalledWith('user-1', 2026, 8);
		});
	});

	it('loads modules for the selected user in admin mode', async () => {
		(getUserModulesForMonth as jest.Mock).mockResolvedValue({
			data: sampleModules,
			error: null,
		});
		const user = {
			uid_user: 'u-9',
			role: 'Taller',
			name: 'Ana',
			last_name: 'Lopez',
			username: 'ana',
		};
		render(<LoadMoreModulesModal {...defaultProps} users={[user] as any} />);

		const selects = screen.getAllByTestId('select-native');
		fireEvent.change(selects[2], { target: { value: 'u-9' } });

		fireEvent.click(screen.getByText('Cargar'));
		await waitFor(() => {
			expect(getUserModulesForMonth).toHaveBeenCalledWith('u-9', 2026, 8);
		});
	});

	it('shows spinner while loading', async () => {
		(getUserModulesForMonth as jest.Mock).mockReturnValue(new Promise(() => {}));
		render(<LoadMoreModulesModal {...defaultProps} user={{ uid: 'user-1' } as any} />);
		fireEvent.click(screen.getByText('Cargar'));
		expect(screen.getByTestId('spinner')).toBeInTheDocument();
	});

	it('shows results with count and total amount after successful load', async () => {
		(getUserModulesForMonth as jest.Mock).mockResolvedValue({
			data: sampleModules,
			error: null,
		});
		render(<LoadMoreModulesModal {...defaultProps} user={{ uid: 'user-1' } as any} />);
		fireEvent.click(screen.getByText('Cargar'));
		await waitFor(() => {
			expect(screen.getByText('Mis módulos')).toBeInTheDocument();
		});
		expect(screen.getByText('2 módulo(s)')).toBeInTheDocument();
		expect(screen.getByText('$350')).toBeInTheDocument();
		expect(screen.getByText('Fundaciones')).toBeInTheDocument();
	});

	it('shows "No hay módulos" when results are empty', async () => {
		(getUserModulesForMonth as jest.Mock).mockResolvedValue({ data: [], error: null });
		render(<LoadMoreModulesModal {...defaultProps} user={{ uid: 'user-1' } as any} />);
		fireEvent.click(screen.getByText('Cargar'));
		await waitFor(() => {
			expect(screen.getByText(/No hay módulos registrados en el período/)).toBeInTheDocument();
		});
	});

	it('shows error and Retry button when load fails', async () => {
		(getUserModulesForMonth as jest.Mock).mockResolvedValue({
			data: null,
			error: { message: 'DB error' },
		});
		render(<LoadMoreModulesModal {...defaultProps} user={{ uid: 'user-1' } as any} />);
		fireEvent.click(screen.getByText('Cargar'));
		await waitFor(() => {
			expect(screen.getByText('DB error')).toBeInTheDocument();
			expect(screen.getByText('Reintentar')).toBeInTheDocument();
		});
	});

	it('Retry reloads modules', async () => {
		(getUserModulesForMonth as jest.Mock)
			.mockResolvedValueOnce({ data: null, error: { message: 'fail' } })
			.mockResolvedValueOnce({ data: sampleModules, error: null });
		render(<LoadMoreModulesModal {...defaultProps} user={{ uid: 'user-1' } as any} />);
		fireEvent.click(screen.getByText('Cargar'));
		await waitFor(() => {
			expect(screen.getByText('Reintentar')).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText('Reintentar'));
		await waitFor(() => {
			expect(screen.getByText('Mis módulos')).toBeInTheDocument();
		});
	});

	it('opens module details when clicking a loaded module', async () => {
		(getUserModulesForMonth as jest.Mock).mockResolvedValue({
			data: sampleModules,
			error: null,
		});
		render(<LoadMoreModulesModal {...defaultProps} user={{ uid: 'user-1' } as any} />);
		fireEvent.click(screen.getByText('Cargar'));
		await waitFor(() => {
			expect(screen.getByText('Fundaciones')).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText('Fundaciones'));
		expect(screen.getByTestId('module-details-modal')).toBeInTheDocument();
		expect(screen.getByTestId('module-details-modal')).toHaveTextContent('Fundaciones');
	});

	it('closes module details when clicking close', async () => {
		(getUserModulesForMonth as jest.Mock).mockResolvedValue({
			data: sampleModules,
			error: null,
		});
		render(<LoadMoreModulesModal {...defaultProps} user={{ uid: 'user-1' } as any} />);
		fireEvent.click(screen.getByText('Cargar'));
		await waitFor(() => {
			expect(screen.getByText('Fundaciones')).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText('Fundaciones'));
		fireEvent.click(screen.getByTestId('close-details'));
		expect(screen.queryByTestId('module-details-modal')).not.toBeInTheDocument();
	});

	it('type="button" on all footer buttons', () => {
		render(<LoadMoreModulesModal {...defaultProps} user={{ uid: 'user-1' } as any} />);
		const footer = screen.getByTestId('dialog-footer');
		const buttons = footer.querySelectorAll('button');
		buttons.forEach((btn) => {
			expect(btn).toHaveAttribute('type', 'button');
		});
	});

	it('closing modal calls onOpenChange with false', () => {
		const onOpenChange = jest.fn();
		render(<LoadMoreModulesModal {...defaultProps} onOpenChange={onOpenChange} />);
		fireEvent.click(screen.getByText('Cerrar'));
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});
