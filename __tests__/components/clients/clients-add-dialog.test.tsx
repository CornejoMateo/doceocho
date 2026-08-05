import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ClientsAddDialog } from '@/components/business/clients/clients-add-dialog';
import { createClient, createClientFolder } from '@/lib/clients/clients';
import { useToast } from '@/components/ui/use-toast';

jest.mock('@/lib/clients/clients', () => ({
	createClient: jest.fn(),
	createClientFolder: jest.fn(),
}));

jest.mock('@/components/ui/use-toast', () => ({
	useToast: jest.fn(),
}));

jest.mock('@/components/ui/dialog', () => ({
	Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({
		children,
		type = 'button',
		...props
	}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
		<button type={type} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/input', () => {
	const React = require('react');

	return {
		Input: React.forwardRef(
			(props: React.InputHTMLAttributes<HTMLInputElement>, ref: React.Ref<HTMLInputElement>) => (
				<input ref={ref} {...props} />
			)
		),
	};
});
jest.mock('@/components/ui/label', () => ({
	Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
		<label {...props}>{children}</label>
	),
}));

jest.mock('@/components/ui/select', () => ({
	Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

describe('ClientsAddDialog', () => {
	const toast = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		(useToast as jest.Mock).mockReturnValue({ toast });
	});

	it('creates a client and its storage folder', async () => {
		(createClient as jest.Mock).mockResolvedValue({
			data: { id: 101 },
			error: null,
		});
		(createClientFolder as jest.Mock).mockResolvedValue({ data: {}, error: null });
		const onClientAdded = jest.fn();
		const onOpenChange = jest.fn();

		render(<ClientsAddDialog open onOpenChange={onOpenChange} onClientAdded={onClientAdded} />);

		fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Juan' } });
		fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: 'Pérez' } });
		fireEvent.change(screen.getByLabelText('DNI/CUIT'), { target: { value: '12345678' } });
		fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'juan@example.com' } });
		fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '123456' } });
		fireEvent.change(screen.getByLabelText('Localidad'), { target: { value: 'Rosario' } });

		fireEvent.click(screen.getByRole('button', { name: 'Guardar cliente' }));

		await waitFor(() => {
			expect(createClient).toHaveBeenCalledWith({
				name: 'Juan',
				last_name: 'Pérez',
				identity_number: '12345678',
				email: 'juan@example.com',
				phone_number: '123456',
				locality: 'Rosario',
				contact_method: null,
				referred_to: null,
			});
		});

		expect(createClientFolder).toHaveBeenCalledWith(101);
		expect(onClientAdded).toHaveBeenCalled();
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Cliente creado',
			})
		);
	});

	it('updates an existing client without creating a folder', async () => {
		const onUpdateClient = jest.fn().mockResolvedValue(undefined);
		const onOpenChange = jest.fn();

		render(
			<ClientsAddDialog
				open
				onOpenChange={onOpenChange}
				clientToEdit={{
					id: 55,
					name: 'Ana',
					last_name: 'Lopez',
					email: 'ana@example.com',
					phone_number: '999',
					locality: 'Córdoba',
					contact_method: 'WhatsApp',
					identity_number: '12345678',
				}}
				onUpdateClient={onUpdateClient}
			/>
		);

		fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana María' } });
		fireEvent.click(screen.getByRole('button', { name: 'Actualizar cliente' }));

		await waitFor(() => {
			expect(onUpdateClient).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 55,
					name: 'Ana María',
					last_name: 'Lopez',
					email: 'ana@example.com',
					phone_number: '999',
					locality: 'Córdoba',
					contact_method: 'WhatsApp',
					identity_number: '12345678',
				})
			);
		});

		expect(createClient).not.toHaveBeenCalled();
		expect(createClientFolder).not.toHaveBeenCalled();
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Cliente actualizado',
			})
		);
	});
	it('updates referred client information', async () => {
		const onUpdateClient = jest.fn().mockResolvedValue(undefined);
		const onOpenChange = jest.fn();

		render(
			<ClientsAddDialog
				open
				onOpenChange={onOpenChange}
				clientToEdit={{
					id: 55,
					name: 'Ana',
					last_name: 'Lopez',
					email: 'ana@example.com',
					phone_number: '999',
					locality: 'Córdoba',
					contact_method: 'REFERIDO',
					referred_to: 'Pedro García',
					identity_number: '12345678',
				}}
				onUpdateClient={onUpdateClient}
			/>
		);

		expect(screen.getByDisplayValue('Pedro García')).toBeInTheDocument();

		fireEvent.change(screen.getByPlaceholderText('Nombre del cliente que dio la referencia'), {
			target: { value: 'Juan Pérez' },
		});

		fireEvent.click(
			screen.getByRole('button', {
				name: 'Actualizar cliente',
			})
		);

		await waitFor(() => {
			expect(onUpdateClient).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 55,
					contact_method: 'REFERIDO',
					referred_to: 'Juan Pérez',
				})
			);
		});

		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Cliente actualizado',
			})
		);
	});
});
