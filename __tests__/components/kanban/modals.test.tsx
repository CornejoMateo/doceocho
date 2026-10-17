import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardCreationModal } from '@/components/business/kanban/board-creation-modal';
import { BoardSettingsModal } from '@/components/business/kanban/board-settings-modal';
import { BoardDeleteModal } from '@/components/business/kanban/board-delete-modal';
import { CardCreationModal } from '@/components/business/kanban/card-creation-modal';
import { ListCreationModal } from '@/components/business/kanban/list-creation-modal';
import { ListEditModal } from '@/components/business/kanban/list-edit-modal';
import { ListDeleteModal } from '@/components/business/kanban/list-delete-modal';

jest.mock('@/utils/format-date', () => ({
	formatCreatedAt: jest.fn(() => '1 ene 2024'),
}));

const mockBoard = {
	id: 1,
	name: 'Test Board',
	description: null,
	color: '#fff',
	created_at: '2024-01-01',
	due_date_tolerance_yellow: 3,
	due_date_tolerance_red: 1,
};
const mockList = { id: 1, created_at: '2024-01-01', board_id: 1, name: 'To Do' };

describe('BoardCreationModal', () => {
	it('calls onCreate with name on submit', async () => {
		const onCreate = jest.fn();
		render(<BoardCreationModal open={true} onOpenChange={jest.fn()} onCreate={onCreate} />);

		await userEvent.type(screen.getByPlaceholderText('Ej: Proyecto Marketing'), 'New Board');
		fireEvent.click(screen.getByText('Crear tablero'));

		// A new board starts from a template, so its lists are created with it.
		expect(onCreate).toHaveBeenCalledWith(
			{
				name: 'New Board',
				description: undefined,
				color: '#4F5C4D',
			},
			'simple'
		);
	});

	it('passes the chosen template instead of the default one', async () => {
		const onCreate = jest.fn();
		render(<BoardCreationModal open={true} onOpenChange={jest.fn()} onCreate={onCreate} />);

		await userEvent.type(screen.getByPlaceholderText('Ej: Proyecto Marketing'), 'Obra nueva');
		fireEvent.click(screen.getByText('Producción de obra'));
		fireEvent.click(screen.getByText('Crear tablero'));

		expect(onCreate).toHaveBeenCalledWith(expect.anything(), 'production');
	});

	it('offers a blank option for people who want to build their own lists', () => {
		render(<BoardCreationModal open={true} onOpenChange={jest.fn()} onCreate={jest.fn()} />);

		expect(screen.getByText('En blanco')).toBeInTheDocument();
		expect(screen.getByText('Por hacer → En proceso → Terminado')).toBeInTheDocument();
	});

	it('does not call onCreate when name is empty', () => {
		const onCreate = jest.fn();
		render(<BoardCreationModal open={true} onOpenChange={jest.fn()} onCreate={onCreate} />);

		expect(screen.getByText('Crear tablero')).toBeDisabled();
	});

	it('calls onOpenChange(false) on cancel', () => {
		const onOpenChange = jest.fn();
		render(<BoardCreationModal open={true} onOpenChange={onOpenChange} onCreate={jest.fn()} />);

		fireEvent.click(screen.getByText('Cancelar'));
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('changes selected color when color swatch is clicked', () => {
		render(<BoardCreationModal open={true} onOpenChange={jest.fn()} onCreate={jest.fn()} />);

		const colorSwatches = screen.getAllByRole('button').filter((b) => b.style.backgroundColor);
		fireEvent.click(colorSwatches[1]);
		expect(colorSwatches[1].className).toContain('border-primary');
	});
});

describe('BoardSettingsModal', () => {
	// Name, description and colour used to live in a separate modal; the board
	// settings now cover everything about the board in one place.
	it('pre-fills every board field', () => {
		render(
			<BoardSettingsModal
				board={mockBoard}
				open={true}
				onOpenChange={jest.fn()}
				onSave={jest.fn()}
			/>
		);

		expect(screen.getByDisplayValue('Test Board')).toBeInTheDocument();
		expect(screen.getByDisplayValue('3')).toBeInTheDocument();
		expect(screen.getByDisplayValue('1')).toBeInTheDocument();
	});

	it('saves the name together with the alert tolerances', () => {
		const onSave = jest.fn();
		render(
			<BoardSettingsModal board={mockBoard} open={true} onOpenChange={jest.fn()} onSave={onSave} />
		);

		fireEvent.click(screen.getByText('Guardar'));

		expect(onSave).toHaveBeenCalledWith({
			name: 'Test Board',
			description: null,
			color: '#fff',
			due_date_tolerance_yellow: 3,
			due_date_tolerance_red: 1,
		});
	});

	it('saves an edited name', async () => {
		const onSave = jest.fn();
		render(
			<BoardSettingsModal board={mockBoard} open={true} onOpenChange={jest.fn()} onSave={onSave} />
		);

		const input = screen.getByDisplayValue('Test Board');
		await userEvent.clear(input);
		await userEvent.type(input, 'Updated Board');
		fireEvent.click(screen.getByText('Guardar'));

		expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated Board' }));
	});

	it('cannot be saved without a name', async () => {
		render(
			<BoardSettingsModal
				board={mockBoard}
				open={true}
				onOpenChange={jest.fn()}
				onSave={jest.fn()}
			/>
		);

		await userEvent.clear(screen.getByDisplayValue('Test Board'));

		expect(screen.getByText('Guardar')).toBeDisabled();
	});

	it('uses defaults when board is null', () => {
		render(
			<BoardSettingsModal board={null} open={true} onOpenChange={jest.fn()} onSave={jest.fn()} />
		);

		expect(screen.getByDisplayValue('2')).toBeInTheDocument();
		expect(screen.getByDisplayValue('0')).toBeInTheDocument();
	});
});

describe('BoardDeleteModal', () => {
	it('shows board name in confirmation', () => {
		render(
			<BoardDeleteModal
				board={mockBoard}
				open={true}
				onOpenChange={jest.fn()}
				onConfirm={jest.fn()}
			/>
		);

		expect(screen.getByText(/Test Board/)).toBeInTheDocument();
	});

	it('calls onConfirm when confirmed', () => {
		const onConfirm = jest.fn();
		render(
			<BoardDeleteModal
				board={mockBoard}
				open={true}
				onOpenChange={jest.fn()}
				onConfirm={onConfirm}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: /eliminar tablero/i }));
		expect(onConfirm).toHaveBeenCalled();
	});
});

describe('CardCreationModal', () => {
	it('calls onCreate with title on submit', async () => {
		const onCreate = jest.fn();
		render(<CardCreationModal open={true} onOpenChange={jest.fn()} onCreate={onCreate} />);

		await userEvent.type(screen.getByPlaceholderText('Ej: Revisar documentación'), 'New Card');
		fireEvent.click(screen.getByText('Crear tarjeta'));

		expect(onCreate).toHaveBeenCalledWith('New Card');
	});

	it('does not call onCreate when title is empty', () => {
		render(<CardCreationModal open={true} onOpenChange={jest.fn()} onCreate={jest.fn()} />);

		expect(screen.getByText('Crear tarjeta')).toBeDisabled();
	});
});

describe('ListCreationModal', () => {
	it('calls onCreate with name on submit', async () => {
		const onCreate = jest.fn();
		render(<ListCreationModal open={true} onOpenChange={jest.fn()} onCreate={onCreate} />);

		await userEvent.type(screen.getByPlaceholderText('Ej: Por hacer'), 'New List');
		fireEvent.click(screen.getByText('Crear Lista'));

		expect(onCreate).toHaveBeenCalledWith('New List');
	});

	it('does not call onCreate when name is empty', () => {
		render(<ListCreationModal open={true} onOpenChange={jest.fn()} onCreate={jest.fn()} />);

		expect(screen.getByText('Crear Lista')).toBeDisabled();
	});
});

describe('ListEditModal', () => {
	it('pre-fills list name', () => {
		render(
			<ListEditModal list={mockList} open={true} onOpenChange={jest.fn()} onSave={jest.fn()} />
		);

		expect(screen.getByDisplayValue('To Do')).toBeInTheDocument();
	});

	it('calls onSave with trimmed name', async () => {
		const onSave = jest.fn();
		render(<ListEditModal list={mockList} open={true} onOpenChange={jest.fn()} onSave={onSave} />);

		const input = screen.getByDisplayValue('To Do');
		await userEvent.clear(input);
		await userEvent.type(input, 'Updated List');
		fireEvent.click(screen.getByText('Guardar'));

		expect(onSave).toHaveBeenCalledWith('Updated List');
	});
});

describe('ListDeleteModal', () => {
	it('shows list name in confirmation', () => {
		render(
			<ListDeleteModal list={mockList} open={true} onOpenChange={jest.fn()} onConfirm={jest.fn()} />
		);

		expect(screen.getByText(/To Do/)).toBeInTheDocument();
	});

	it('calls onConfirm when confirmed', () => {
		const onConfirm = jest.fn();
		render(
			<ListDeleteModal list={mockList} open={true} onOpenChange={jest.fn()} onConfirm={onConfirm} />
		);

		fireEvent.click(screen.getByText('Eliminar Lista'));
		expect(onConfirm).toHaveBeenCalled();
	});
});
