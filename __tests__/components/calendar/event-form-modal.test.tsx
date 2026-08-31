import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EventFormModal } from '@/components/business/calendar/event-form-modal';
import { useToast } from '@/components/ui/use-toast';

jest.mock('@/components/ui/use-toast', () => ({
	useToast: jest.fn(),
}));

const mockGetWorksByClientId = jest.fn();

jest.mock('@/lib/works/works', () => ({
	getWorksByClientId: (...args: any[]) => mockGetWorksByClientId(...args),
}));

jest.mock('@/components/ui/client-select', () => ({
	ClientSelect: ({ onValueChange, onManualInput }: any) => (
		<div>
			<button type="button" onClick={() => onValueChange(1, 'Cliente Test')}>
				Select Client 1
			</button>
			<button type="button" onClick={() => onManualInput?.()}>
				Manual Client
			</button>
		</div>
	),
}));

// Mock only complex portal/dialog behavior
jest.mock('@/components/ui/dialog', () => ({
	Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	DialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('Mode: create - EventFormModal', () => {
	const toast = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();

		(useToast as jest.Mock).mockReturnValue({
			toast,
		});
	});

	it('shows validation toast and prevents submit when date is missing', async () => {
		const user = userEvent.setup();
		const onSave = jest.fn();

		render(
			<EventFormModal
				onSave={onSave}
				eventTypes={[
					{
						id: 1,
						name: 'reuniones',
						color: '#7c3aed',
					},
				]}
			>
				<button type="button">Open modal</button>
			</EventFormModal>
		);

		await user.click(screen.getByRole('button', { name: /open modal/i }));

		await user.click(screen.getByRole('button', { name: /guardar/i }));

		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Error en la fecha',
			})
		);

		expect(onSave).not.toHaveBeenCalled();
	});

	describe('work selection', () => {
		const mockWorks = [
			{
				id: 10,
				locality: 'Palermo',
				address: 'Av. Santa Fe 1234',
				zone: 'Norte',
				hood: null,
				client_id: 1,
			},
			{
				id: 20,
				locality: 'Belgrano',
				address: 'Av. Cabildo 2000',
				zone: null,
				hood: 'Belgrano R',
				client_id: 1,
			},
		];

		const renderModal = (onSave = jest.fn()) =>
			render(
				<EventFormModal
					onSave={onSave}
					eventTypes={[{ id: 1, name: 'reuniones', color: '#7c3aed' }]}
				>
					<button type="button">Open modal</button>
				</EventFormModal>
			);

		const selectWorkByRadixHiddenSelect = (value: string) => {
			const hiddenSelects = document.querySelectorAll<HTMLSelectElement>(
				'select[aria-hidden="true"]'
			);
			const workSelect = Array.from(hiddenSelects).find((s) =>
				Array.from(s.options).some((o) => o.value === 'manual')
			);
			if (workSelect) {
				fireEvent.change(workSelect, { target: { value } });
			}
			return workSelect;
		};

		it('loads works when a client is selected', async () => {
			mockGetWorksByClientId.mockResolvedValue({ data: mockWorks, error: null });

			const user = userEvent.setup();
			renderModal();

			await user.click(screen.getByRole('button', { name: /open modal/i }));
			await user.click(screen.getByRole('button', { name: /select client 1/i }));

			await waitFor(() => {
				expect(mockGetWorksByClientId).toHaveBeenCalledWith(1);
			});
		});

		it('shows work options in the select after client selection', async () => {
			mockGetWorksByClientId.mockResolvedValue({ data: mockWorks, error: null });

			const user = userEvent.setup();
			renderModal();

			await user.click(screen.getByRole('button', { name: /open modal/i }));
			await user.click(screen.getByRole('button', { name: /select client 1/i }));

			await waitFor(() => {
				const hiddenSelects = document.querySelectorAll<HTMLSelectElement>(
					'select[aria-hidden="true"]'
				);
				const workSelect = Array.from(hiddenSelects).find((s) =>
					Array.from(s.options).some((o) => o.value === 'manual')
				);
				expect(workSelect).toBeTruthy();
				expect(Array.from(workSelect!.options).some((o) => o.text.includes('Palermo'))).toBe(true);
				expect(Array.from(workSelect!.options).some((o) => o.text.includes('Belgrano'))).toBe(true);
			});
		});

		it('shows manual work input when "Otro" is selected', async () => {
			mockGetWorksByClientId.mockResolvedValue({ data: mockWorks, error: null });

			const user = userEvent.setup();
			renderModal();

			await user.click(screen.getByRole('button', { name: /open modal/i }));
			await user.click(screen.getByRole('button', { name: /select client 1/i }));

			selectWorkByRadixHiddenSelect('manual');
			await waitFor(() => {
				expect(screen.getByLabelText(/ubicación/i)).toBeInTheDocument();
			});

			selectWorkByRadixHiddenSelect('manual');

			await waitFor(() => {
				expect(screen.getByLabelText(/ubicación/i)).toBeInTheDocument();
			});
		});

		it('includes selected work_id in the submitted data', async () => {
			mockGetWorksByClientId.mockResolvedValue({ data: mockWorks, error: null });

			const user = userEvent.setup();
			const onSave = jest.fn().mockResolvedValue(true);

			renderModal(onSave);

			await user.click(screen.getByRole('button', { name: /open modal/i }));
			await user.click(screen.getByRole('button', { name: /select client 1/i }));

			await waitFor(() => {
				expect(selectWorkByRadixHiddenSelect('10')).toBeTruthy();
			});

			selectWorkByRadixHiddenSelect('10');

			const today = new Date();
			const dateButton = screen.getByRole('button', { name: /seleccionar fecha/i });
			await user.click(dateButton);

			const dayButton = screen
				.getAllByRole('button')
				.find((btn) => btn.textContent === String(today.getDate()));
			await user.click(dayButton!);

			await user.click(screen.getByRole('button', { name: /guardar/i }));

			await waitFor(() => {
				expect(onSave).toHaveBeenCalledWith(
					expect.objectContaining({
						work_id: 10,
						work_location: 'Palermo, Av. Santa Fe 1234',
					})
				);
			});
		});

		it('includes manual work_location in the submitted data', async () => {
			const user = userEvent.setup();
			const onSave = jest.fn().mockResolvedValue(true);

			renderModal(onSave);

			await user.click(screen.getByRole('button', { name: /open modal/i }));
			await user.click(screen.getByRole('button', { name: /manual client/i }));

			await waitFor(() => {
				expect(screen.getByLabelText(/ubicación/i)).toBeInTheDocument();
			});

			await user.type(screen.getByLabelText(/ubicación/i), 'Dirección manual 123');

			const today = new Date();
			const dateButton = screen.getByRole('button', { name: /seleccionar fecha/i });
			await user.click(dateButton);

			const dayButton = screen
				.getAllByRole('button')
				.find((btn) => btn.textContent === String(today.getDate()));
			await user.click(dayButton!);

			await user.click(screen.getByRole('button', { name: /guardar/i }));

			await waitFor(() => {
				expect(onSave).toHaveBeenCalledWith(
					expect.objectContaining({
						work_id: null,
						work_location: 'Dirección manual 123',
					})
				);
			});
		});
	});
});

describe('edit mode', () => {
	const toast = jest.fn();

	beforeEach(() => {
		(useToast as jest.Mock).mockReturnValue({
			toast,
		});
	});

	const event = {
		id: 25,
		title: 'Evento existente',
		type: 'reuniones',
		date: '2025-05-05',
		client_id: 1,
		client_name: 'Cliente Test',
		work_id: 10,
		work_location: '',
		description: 'Descripción vieja',
		remember: false,
	} as any;

	it('loads event data when opening in edit mode', async () => {
		mockGetWorksByClientId.mockResolvedValue({
			data: [],
			error: null,
		});

		render(
			<EventFormModal
				mode="edit"
				open
				event={event}
				onOpenChange={jest.fn()}
				onSave={jest.fn()}
				eventTypes={[
					{
						id: 1,
						name: 'reuniones',
						color: '#7c3aed',
					},
				]}
			/>
		);

		expect(screen.getByText('Editar evento')).toBeInTheDocument();

		expect(screen.getByDisplayValue('Evento existente')).toBeInTheDocument();

		expect(screen.getByDisplayValue('Descripción vieja')).toBeInTheDocument();

		expect(mockGetWorksByClientId).toHaveBeenCalledWith(1);
	});

	it('sends the event id when saving', async () => {
		mockGetWorksByClientId.mockResolvedValue({
			data: [],
			error: null,
		});

		const user = userEvent.setup();
		const onSave = jest.fn().mockResolvedValue(true);

		render(
			<EventFormModal
				mode="edit"
				open
				event={event}
				onOpenChange={jest.fn()}
				onSave={onSave}
				eventTypes={[
					{
						id: 1,
						name: 'reuniones',
						color: '#7c3aed',
					},
				]}
			/>
		);

		await user.clear(screen.getByDisplayValue('Evento existente'));
		await user.type(screen.getByPlaceholderText('Título del evento'), 'Evento actualizado');

		await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 25,
					title: 'Evento actualizado',
				})
			);
		});
	});

	it('does not show "Evento creado" toast in edit mode', async () => {
		mockGetWorksByClientId.mockResolvedValue({
			data: [],
			error: null,
		});

		const user = userEvent.setup();

		render(
			<EventFormModal
				mode="edit"
				open
				event={event}
				onOpenChange={jest.fn()}
				onSave={jest.fn().mockResolvedValue(true)}
				eventTypes={[
					{
						id: 1,
						name: 'reuniones',
						color: '#7c3aed',
					},
				]}
			/>
		);

		await user.click(
			screen.getByRole('button', {
				name: /guardar cambios/i,
			})
		);

		await waitFor(() => {
			expect(toast).not.toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'Evento creado',
				})
			);
		});
	});

	it('calls onOpenChange(false) when cancelling in controlled mode', async () => {
		const user = userEvent.setup();

		const onOpenChange = jest.fn();

		render(
			<EventFormModal
				mode="edit"
				open
				event={event}
				onOpenChange={onOpenChange}
				onSave={jest.fn()}
				eventTypes={[
					{
						id: 1,
						name: 'reuniones',
						color: '#7c3aed',
					},
				]}
			/>
		);

		await user.click(screen.getByRole('button', { name: /cancelar/i }));

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});
