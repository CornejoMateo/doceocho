import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CardForm, type CardFormProps } from '@/components/business/kanban/card-form';
import type { CardWithRelations } from '@/components/business/kanban/types';

jest.mock('@/utils/format-date', () => ({
	formatCreatedAt: jest.fn(() => '1 ene 2024'),
}));

const mockCard: CardWithRelations = {
	id: 1,
	created_at: '2024-01-01T00:00:00Z',
	list_id: 1,
	title: 'Test Card',
	description: 'A description',
	position: 0,
	due_date: '2024-12-31',
	priority: 'high',
	completed_at: null,
	color: null,
	files: [],
	list: { id: 1, name: 'To Do', created_at: '2024-01-01', board_id: 1 },
};

const mockCardNoDate: CardWithRelations = {
	...mockCard,
	due_date: null,
	priority: 'none' as const,
	description: null,
};

function createProps(overrides: Partial<CardFormProps> = {}): CardFormProps {
	return {
		card: mockCard,
		updateCard: jest.fn(),
		removeCard: jest.fn().mockResolvedValue({ error: null }),
		onClose: jest.fn(),
		onSaveSuccess: jest.fn(),
		onDeleteSuccess: jest.fn(),
		onOpenGallery: jest.fn(),
		...overrides,
	};
}

function renderForm(props: Partial<CardFormProps> = {}) {
	return render(<CardForm {...createProps(props)} />);
}

describe('CardForm', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders title, description, due date and priority from card', () => {
		renderForm();
		expect(screen.getByDisplayValue('Test Card')).toBeInTheDocument();
		expect(screen.getByDisplayValue('A description')).toBeInTheDocument();
		expect(screen.getByDisplayValue('2024-12-31')).toBeInTheDocument();
		const select = screen.getByDisplayValue('Alta') as HTMLSelectElement;
		expect(select).toBeInTheDocument();
	});

	it('renders list name and formatted date', () => {
		renderForm();
		expect(screen.getByText((content) => content.includes('To Do'))).toBeInTheDocument();
		expect(screen.getByText((content) => content.includes('1 ene 2024'))).toBeInTheDocument();
	});

	it('renders description placeholder when no description', () => {
		renderForm({ card: mockCardNoDate });
		const textarea = screen.getByPlaceholderText('Agregar una descripción más detallada...');
		expect(textarea).toBeInTheDocument();
		expect(textarea).toHaveValue('');
	});

	it('renders "Sin prioridad" when priority is none', () => {
		renderForm({ card: mockCardNoDate });
		expect(screen.getByDisplayValue('Sin prioridad')).toBeInTheDocument();
	});

	it('does not show save button initially', () => {
		renderForm();
		expect(screen.queryByText('Guardar')).not.toBeInTheDocument();
	});

	it('shows save button when title changes', async () => {
		renderForm();
		const input = screen.getByDisplayValue('Test Card');
		await userEvent.clear(input);
		await userEvent.type(input, 'New Title');
		expect(screen.getByText('Guardar')).toBeInTheDocument();
	});

	it('shows save button when description changes', async () => {
		renderForm();
		const textarea = screen.getByDisplayValue('A description');
		await userEvent.clear(textarea);
		await userEvent.type(textarea, 'New description');
		expect(screen.getByText('Guardar')).toBeInTheDocument();
	});

	it('shows save button when due date changes', async () => {
		renderForm();
		const dateInput = screen.getByDisplayValue('2024-12-31');
		await userEvent.clear(dateInput);
		await userEvent.type(dateInput, '2025-01-15');
		expect(screen.getByText('Guardar')).toBeInTheDocument();
	});

	it('shows save button when priority changes', async () => {
		renderForm();
		const select = screen.getByDisplayValue('Alta');
		fireEvent.change(select, { target: { value: 'low' } });
		expect(screen.getByText('Guardar')).toBeInTheDocument();
	});

	it('calls updateCard, onSaveSuccess and onClose on save', async () => {
		const updateCard = jest.fn().mockResolvedValue(mockCard);
		const onClose = jest.fn();
		const onSaveSuccess = jest.fn();
		renderForm({ updateCard, onClose, onSaveSuccess });

		const input = screen.getByDisplayValue('Test Card');
		await userEvent.clear(input);
		await userEvent.type(input, 'Updated');

		fireEvent.click(screen.getByText('Guardar'));

		await waitFor(() => {
			expect(updateCard).toHaveBeenCalledWith({
				title: 'Updated',
				description: 'A description',
				due_date: '2024-12-31',
				priority: 'high',
			});
		});
		expect(onSaveSuccess).toHaveBeenCalled();
		expect(onClose).toHaveBeenCalled();
	});

	it('hides save button after save', async () => {
		const updateCard = jest.fn().mockResolvedValue(mockCard);
		renderForm({ updateCard });

		const input = screen.getByDisplayValue('Test Card');
		await userEvent.clear(input);
		await userEvent.type(input, 'Updated');

		fireEvent.click(screen.getByText('Guardar'));

		await waitFor(() => {
			expect(screen.queryByText('Guardar')).not.toBeInTheDocument();
		});
	});

	it('saves with null due_date when empty', async () => {
		const updateCard = jest.fn().mockResolvedValue(mockCard);
		renderForm({ card: mockCardNoDate, updateCard });

		const input = screen.getByDisplayValue('Test Card');
		await userEvent.clear(input);
		await userEvent.type(input, 'Changed');

		fireEvent.click(screen.getByText('Guardar'));

		await waitFor(() => {
			expect(updateCard).toHaveBeenCalledWith(expect.objectContaining({ due_date: null }));
		});
	});

	it('shows delete confirmation when delete button clicked', () => {
		renderForm();
		fireEvent.click(screen.getByText('Eliminar tarjeta'));
		expect(screen.getByText('¿Estás seguro de eliminar esta tarjeta?')).toBeInTheDocument();
	});

	it('calls removeCard and onDeleteSuccess on delete confirm', async () => {
		const removeCard = jest.fn().mockResolvedValue({ error: null });
		const onDeleteSuccess = jest.fn();
		renderForm({ removeCard, onDeleteSuccess });

		fireEvent.click(screen.getByText('Eliminar tarjeta'));
		fireEvent.click(screen.getByText('Eliminar'));

		await waitFor(() => {
			expect(removeCard).toHaveBeenCalled();
		});
		expect(onDeleteSuccess).toHaveBeenCalled();
	});

	it('hides delete confirmation on cancel', () => {
		renderForm();
		fireEvent.click(screen.getByText('Eliminar tarjeta'));
		fireEvent.click(screen.getByText('Cancelar'));
		expect(screen.queryByText('¿Estás seguro de eliminar esta tarjeta?')).not.toBeInTheDocument();
	});

	it('shows files section when onOpenGallery is provided', () => {
		renderForm();
		expect(screen.getByText('Adjuntos')).toBeInTheDocument();
		expect(screen.getByText('Ver archivos')).toBeInTheDocument();
	});

	it('hides files section when onOpenGallery is not provided', () => {
		renderForm({ onOpenGallery: undefined });
		expect(screen.queryByText('Adjuntos')).not.toBeInTheDocument();
		expect(screen.queryByText('Ver archivos')).not.toBeInTheDocument();
	});

	it('calls onOpenGallery when Adjuntos clicked', () => {
		const onOpenGallery = jest.fn();
		renderForm({ onOpenGallery });
		fireEvent.click(screen.getByText('Adjuntos'));
		expect(onOpenGallery).toHaveBeenCalled();
	});

	it('requestClose calls onClose when no unsaved changes', () => {
		const onClose = jest.fn();
		const ref = React.createRef<any>();
		render(<CardForm {...createProps({ onClose })} ref={ref} />);
		ref.current.requestClose();
		expect(onClose).toHaveBeenCalled();
	});

	it('requestClose shows confirmation when unsaved changes', async () => {
		const onClose = jest.fn();
		const ref = React.createRef<any>();
		render(<CardForm {...createProps({ onClose })} ref={ref} />);

		const input = screen.getByDisplayValue('Test Card');
		await userEvent.clear(input);
		await userEvent.type(input, 'Modified');

		await React.act(async () => {
			ref.current.requestClose();
		});

		await waitFor(() => {
			expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument();
		});
		expect(onClose).not.toHaveBeenCalled();
	});

	it('requestClose calls onClose after confirming unsaved dialog', async () => {
		const onClose = jest.fn();
		const ref = React.createRef<any>();
		render(<CardForm {...createProps({ onClose })} ref={ref} />);

		const input = screen.getByDisplayValue('Test Card');
		await userEvent.clear(input);
		await userEvent.type(input, 'Modified');

		await React.act(async () => {
			ref.current.requestClose();
		});

		await waitFor(() => {
			expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument();
		});

		fireEvent.click(screen.getByText('Cerrar sin guardar'));
		expect(onClose).toHaveBeenCalled();
	});

	it('requestClose cancels unsaved dialog', async () => {
		const onClose = jest.fn();
		const ref = React.createRef<any>();
		render(<CardForm {...createProps({ onClose })} ref={ref} />);

		const input = screen.getByDisplayValue('Test Card');
		await userEvent.clear(input);
		await userEvent.type(input, 'Modified');

		await React.act(async () => {
			ref.current.requestClose();
		});

		await waitFor(() => {
			expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument();
		});

		fireEvent.click(screen.getByText('Cancelar'));
		expect(onClose).not.toHaveBeenCalled();
	});

	it('reloads form state when card prop changes', () => {
		const { rerender } = render(<CardForm {...createProps({ card: mockCard })} />);

		expect(screen.getByDisplayValue('Test Card')).toBeInTheDocument();

		const updatedCard = { ...mockCard, title: 'Updated Card' };
		rerender(<CardForm {...createProps({ card: updatedCard })} />);

		expect(screen.getByDisplayValue('Updated Card')).toBeInTheDocument();
	});

	it('resets hasUnsavedChanges when card prop changes', async () => {
		const { rerender } = render(<CardForm {...createProps({ card: mockCard })} />);

		const input = screen.getByDisplayValue('Test Card');
		await userEvent.clear(input);
		await userEvent.type(input, 'Temp');

		expect(screen.getByText('Guardar')).toBeInTheDocument();

		const updatedCard = { ...mockCard, title: 'New Card' };
		rerender(<CardForm {...createProps({ card: updatedCard })} />);

		expect(screen.queryByText('Guardar')).not.toBeInTheDocument();
	});

	it('renders due date empty when card has no due_date', () => {
		renderForm({ card: mockCardNoDate });
		const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
		expect(dateInput).toBeInTheDocument();
		expect(dateInput.value).toBe('');
	});

	it('description textarea has placeholder when empty', () => {
		renderForm({ card: mockCardNoDate });
		expect(
			screen.getByPlaceholderText('Agregar una descripción más detallada...')
		).toBeInTheDocument();
	});
});
