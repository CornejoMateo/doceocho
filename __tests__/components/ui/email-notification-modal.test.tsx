import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmailNotificationModal } from '@/components/ui/email-notification-modal';
import { toast } from '@/components/ui/use-toast';

jest.mock('@/components/ui/dialog', () => ({
	Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
	DialogContent: ({ children }: any) => <div>{children}</div>,
	DialogHeader: ({ children }: any) => <div>{children}</div>,
	DialogTitle: ({ children }: any) => <h2>{children}</h2>,
	DialogDescription: ({ children }: any) => <div>{children}</div>,
	DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/input', () => ({
	Input: (props: any) => <input {...props} />,
}));

jest.mock('@/components/ui/textarea', () => ({
	Textarea: (props: any) => <textarea {...props} />,
}));

jest.mock('@/components/ui/label', () => ({
	Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, disabled, ...props }: any) => (
		<button onClick={onClick} disabled={disabled} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/alert', () => ({
	Alert: ({ children, ...props }: any) => <div {...props}>{children}</div>,
	AlertDescription: ({ children }: any) => <span>{children}</span>,
}));

jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => `translated: ${e?.message || e}`,
}));

jest.mock('lucide-react', () => ({
	Mail: () => null,
	MapPin: () => null,
	Clock: () => null,
	User: () => null,
	AlertCircle: () => null,
	Loader2: () => null,
}));

jest.mock('date-fns', () => ({
	format: (_date: any, fmt: string) => {
		if (fmt === 'yyyy-MM-dd') return '2026-07-22';
		if (fmt === 'dd/MM/yyyy') return '22/07/2026';
		return '22/07/2026';
	},
}));

const baseClient = {
	id: 1,
	name: 'Juan',
	last_name: 'Pérez',
	email: 'juan@test.com',
};

const baseWork = {
	id: 10,
	locality: 'Córdoba',
	zone: 'Norte',
	hood: 'Nueva Córdoba',
	address: 'Av. General Paz 123',
	client_id: 1,
};

describe('EmailNotificationModal', () => {
	const onSendEmail = jest.fn();
	const onOpenChange = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		onSendEmail.mockResolvedValue(undefined);
	});

	it('does not render when client is null', () => {
		const { container } = render(
			<EmailNotificationModal
				isOpen={true}
				onOpenChange={onOpenChange}
				client={null}
				work={baseWork}
				onSendEmail={onSendEmail}
			/>
		);
		expect(container.innerHTML).toBe('');
	});

	it('does not render when work is null', () => {
		const { container } = render(
			<EmailNotificationModal
				isOpen={true}
				onOpenChange={onOpenChange}
				client={baseClient}
				work={null}
				onSendEmail={onSendEmail}
			/>
		);
		expect(container.innerHTML).toBe('');
	});

	it('displays client and work information', () => {
		render(
			<EmailNotificationModal
				isOpen={true}
				onOpenChange={onOpenChange}
				client={baseClient}
				work={baseWork}
				onSendEmail={onSendEmail}
			/>
		);
		expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
		expect(screen.getByText('juan@test.com')).toBeInTheDocument();
		expect(screen.getByText('Obra:')).toBeInTheDocument();
		expect(screen.getByText(/Córdoba, Av. General Paz 123/)).toBeInTheDocument();
	});

	it('pre-fills recipient with client email', () => {
		render(
			<EmailNotificationModal
				isOpen={true}
				onOpenChange={onOpenChange}
				client={baseClient}
				work={baseWork}
				onSendEmail={onSendEmail}
			/>
		);
		const input = screen.getByLabelText('Destinatario');
		expect(input).toHaveValue('juan@test.com');
	});

	it('allows editing the recipient', () => {
		render(
			<EmailNotificationModal
				isOpen={true}
				onOpenChange={onOpenChange}
				client={baseClient}
				work={baseWork}
				onSendEmail={onSendEmail}
			/>
		);
		const input = screen.getByLabelText('Destinatario');
		fireEvent.change(input, { target: { value: 'otro@test.com' } });
		expect(input).toHaveValue('otro@test.com');
	});

	it('shows subject placeholder with locality', () => {
		render(
			<EmailNotificationModal
				isOpen={true}
				onOpenChange={onOpenChange}
				client={baseClient}
				work={baseWork}
				onSendEmail={onSendEmail}
			/>
		);
		const input = screen.getByLabelText('Asunto del Email');
		expect(input).toHaveAttribute('placeholder', 'Notificación sobre obra en Córdoba');
	});

	it('displays separated work details in the message', () => {
		render(
			<EmailNotificationModal
				isOpen={true}
				onOpenChange={onOpenChange}
				client={baseClient}
				work={baseWork}
				onSendEmail={onSendEmail}
			/>
		);
		const textarea = screen.getByLabelText('Mensaje') as HTMLTextAreaElement;
		expect(textarea.value).toContain('- Localidad: Córdoba');
		expect(textarea.value).toContain('- Zona: Norte');
		expect(textarea.value).toContain('- Barrio: Nueva Córdoba');
		expect(textarea.value).toContain('- Dirección: Av. General Paz 123');
	});

	it('omits null work details from the message', () => {
		const workPartial = { ...baseWork, zone: null, hood: null };
		render(
			<EmailNotificationModal
				isOpen={true}
				onOpenChange={onOpenChange}
				client={baseClient}
				work={workPartial}
				onSendEmail={onSendEmail}
			/>
		);
		const textarea = screen.getByLabelText('Mensaje') as HTMLTextAreaElement;
		expect(textarea.value).toContain('- Localidad: Córdoba');
		expect(textarea.value).toContain('- Dirección: Av. General Paz 123');
		expect(textarea.value).not.toContain('Zona:');
		expect(textarea.value).not.toContain('Barrio:');
	});

	it('disables send button when recipient is empty', () => {
		render(
			<EmailNotificationModal
				isOpen={true}
				onOpenChange={onOpenChange}
				client={{ ...baseClient, email: '' }}
				work={baseWork}
				onSendEmail={onSendEmail}
			/>
		);
		expect(screen.getByText('Enviar Email').closest('button')).toBeDisabled();
	});

	it('sends email with correct data', async () => {
		render(
			<EmailNotificationModal
				isOpen={true}
				onOpenChange={onOpenChange}
				client={baseClient}
				work={baseWork}
				onSendEmail={onSendEmail}
			/>
		);
		fireEvent.click(screen.getByText('Enviar Email'));

		await waitFor(() => {
			expect(onSendEmail).toHaveBeenCalledTimes(1);
		});

		expect(onSendEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				clientId: 1,
				workId: 10,
				to: 'juan@test.com',
			})
		);
	});

	it('uses default subject when field is empty', async () => {
		render(
			<EmailNotificationModal
				isOpen={true}
				onOpenChange={onOpenChange}
				client={baseClient}
				work={baseWork}
				onSendEmail={onSendEmail}
			/>
		);
		fireEvent.click(screen.getByText('Enviar Email'));

		await waitFor(() => {
			expect(onSendEmail).toHaveBeenCalledWith(
				expect.objectContaining({
					subject: 'Notificación sobre obra en Córdoba',
				})
			);
		});
	});

	it('shows success toast after sending', async () => {
		render(
			<EmailNotificationModal
				isOpen={true}
				onOpenChange={onOpenChange}
				client={baseClient}
				work={baseWork}
				onSendEmail={onSendEmail}
			/>
		);
		fireEvent.click(screen.getByText('Enviar Email'));

		await waitFor(() => {
			expect(toast).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Email enviado',
				})
			);
		});
	});

	it('closes modal after successful send', async () => {
		render(
			<EmailNotificationModal
				isOpen={true}
				onOpenChange={onOpenChange}
				client={baseClient}
				work={baseWork}
				onSendEmail={onSendEmail}
			/>
		);
		fireEvent.click(screen.getByText('Enviar Email'));

		await waitFor(() => {
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});
	});

	it('displays error when send fails', async () => {
		onSendEmail.mockRejectedValue(new Error('SMTP connection failed'));
		render(
			<EmailNotificationModal
				isOpen={true}
				onOpenChange={onOpenChange}
				client={baseClient}
				work={baseWork}
				onSendEmail={onSendEmail}
			/>
		);
		fireEvent.click(screen.getByText('Enviar Email'));

		await waitFor(() => {
			expect(screen.getByText('SMTP connection failed')).toBeInTheDocument();
		});
	});

	it('shows error toast when send fails', async () => {
		onSendEmail.mockRejectedValue(new Error('Fail'));
		render(
			<EmailNotificationModal
				isOpen={true}
				onOpenChange={onOpenChange}
				client={baseClient}
				work={baseWork}
				onSendEmail={onSendEmail}
			/>
		);
		fireEvent.click(screen.getByText('Enviar Email'));

		await waitFor(() => {
			expect(toast).toHaveBeenCalledWith(
				expect.objectContaining({
					variant: 'destructive',
				})
			);
		});
	});

	it('closes modal with cancel button', () => {
		render(
			<EmailNotificationModal
				isOpen={true}
				onOpenChange={onOpenChange}
				client={baseClient}
				work={baseWork}
				onSendEmail={onSendEmail}
			/>
		);
		fireEvent.click(screen.getByText('Cancelar'));
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('shows arrival notice when date changes', async () => {
		render(
			<EmailNotificationModal
				isOpen={true}
				onOpenChange={onOpenChange}
				client={baseClient}
				work={baseWork}
				onSendEmail={onSendEmail}
			/>
		);
		const dateInput = screen.getByLabelText('Fecha de llegada');
		fireEvent.change(dateInput, { target: { value: '2026-08-01' } });

		await waitFor(() => {
			expect(screen.getByText(/llegará el/)).toBeInTheDocument();
		});
	});

	it('shows arrival notice when time changes', async () => {
		render(
			<EmailNotificationModal
				isOpen={true}
				onOpenChange={onOpenChange}
				client={baseClient}
				work={baseWork}
				onSendEmail={onSendEmail}
			/>
		);
		const timeInput = screen.getByLabelText('Hora de llegada');
		fireEvent.change(timeInput, { target: { value: '14:30' } });

		await waitFor(() => {
			expect(screen.getByText(/a las 14:30/)).toBeInTheDocument();
		});
	});
});
