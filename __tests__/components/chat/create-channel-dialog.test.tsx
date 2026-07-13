import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateChannelDialog } from '@/components/business/chat/create-channel-dialog';

jest.mock('@/components/provider/auth-provider', () => ({
	useAuth: () => ({
		user: { id: 'user-1', username: 'admin', name: 'Admin', last_name: 'User', role: 'Admin' },
	}),
}));

jest.mock('@/components/ui/dialog', () => ({
	Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
	DialogContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
	DialogHeader: ({ children }: any) => <div>{children}</div>,
	DialogTitle: ({ children }: any) => <h2>{children}</h2>,
	DialogDescription: ({ children }: any) => <p>{children}</p>,
	DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, disabled, type, ...props }: any) => (
		<button onClick={onClick} disabled={disabled} type={type} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/input', () => ({
	Input: ({ value, onChange, id, placeholder, required, ...props }: any) => (
		<input
			value={value}
			onChange={onChange}
			id={id}
			placeholder={placeholder}
			required={required}
			{...props}
		/>
	),
}));

jest.mock('@/components/ui/label', () => ({
	Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

jest.mock('@/components/ui/textarea', () => ({
	Textarea: ({ value, onChange, id, placeholder, rows, ...props }: any) => (
		<textarea
			value={value}
			onChange={onChange}
			id={id}
			placeholder={placeholder}
			rows={rows}
			{...props}
		/>
	),
}));

jest.mock('@/lib/chat/channels', () => ({
	createChannelAction: jest.fn(),
}));

jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(),
}));

import { createChannelAction } from '@/lib/chat/channels';
import { toast } from '@/components/ui/use-toast';

describe('CreateChannelDialog', () => {
	const defaultProps = {
		open: true,
		onOpenChange: jest.fn(),
		onChannelCreated: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders when open', () => {
		render(<CreateChannelDialog {...defaultProps} />);
		expect(screen.getByTestId('dialog')).toBeInTheDocument();
	});

	it('does not render when closed', () => {
		render(<CreateChannelDialog {...defaultProps} open={false} />);
		expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
	});

	it('renders the title', () => {
		render(<CreateChannelDialog {...defaultProps} />);
		expect(screen.getByText('Crear nuevo canal')).toBeInTheDocument();
	});

	it('renders name input', () => {
		render(<CreateChannelDialog {...defaultProps} />);
		expect(screen.getByPlaceholderText('Ej: Equipo de Ventas')).toBeInTheDocument();
	});

	it('renders description textarea', () => {
		render(<CreateChannelDialog {...defaultProps} />);
		expect(screen.getByPlaceholderText('Descripción del canal (opcional)')).toBeInTheDocument();
	});

	it('disables submit button when name is empty', () => {
		render(<CreateChannelDialog {...defaultProps} />);
		expect(screen.getByText('Crear canal')).toBeDisabled();
	});

	it('enables submit button when name is entered', () => {
		render(<CreateChannelDialog {...defaultProps} />);
		fireEvent.change(screen.getByPlaceholderText('Ej: Equipo de Ventas'), {
			target: { value: 'Nuevo canal' },
		});
		expect(screen.getByText('Crear canal')).not.toBeDisabled();
	});

	it('calls createChannelAction on submit', async () => {
		(createChannelAction as jest.Mock).mockResolvedValue({ error: null });
		render(<CreateChannelDialog {...defaultProps} />);

		fireEvent.change(screen.getByPlaceholderText('Ej: Equipo de Ventas'), {
			target: { value: 'Canal test' },
		});
		fireEvent.change(screen.getByPlaceholderText('Descripción del canal (opcional)'), {
			target: { value: 'Una descripción' },
		});
		fireEvent.click(screen.getByText('Crear canal'));

		await waitFor(() => {
			expect(createChannelAction).toHaveBeenCalledWith('Canal test', 'Una descripción');
		});
	});

	it('calls onChannelCreated on success', async () => {
		(createChannelAction as jest.Mock).mockResolvedValue({ error: null });
		render(<CreateChannelDialog {...defaultProps} />);

		fireEvent.change(screen.getByPlaceholderText('Ej: Equipo de Ventas'), {
			target: { value: 'Canal test' },
		});
		fireEvent.click(screen.getByText('Crear canal'));

		await waitFor(() => {
			expect(defaultProps.onChannelCreated).toHaveBeenCalled();
		});
	});

	it('shows error toast on failure', async () => {
		(createChannelAction as jest.Mock).mockResolvedValue({ error: 'Nombre duplicado' });
		render(<CreateChannelDialog {...defaultProps} />);

		fireEvent.change(screen.getByPlaceholderText('Ej: Equipo de Ventas'), {
			target: { value: 'Canal test' },
		});
		fireEvent.click(screen.getByText('Crear canal'));

		await waitFor(() => {
			expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
		});
	});

	it('calls onOpenChange when cancel is clicked', () => {
		render(<CreateChannelDialog {...defaultProps} />);
		fireEvent.click(screen.getByText('Cancelar'));
		expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
	});

	it('resets fields after successful creation', async () => {
		(createChannelAction as jest.Mock).mockResolvedValue({ error: null });
		render(<CreateChannelDialog {...defaultProps} />);

		const nameInput = screen.getByPlaceholderText('Ej: Equipo de Ventas');
		fireEvent.change(nameInput, { target: { value: 'Canal test' } });
		fireEvent.click(screen.getByText('Crear canal'));

		await waitFor(() => {
			expect((nameInput as HTMLInputElement).value).toBe('');
		});
	});
});
