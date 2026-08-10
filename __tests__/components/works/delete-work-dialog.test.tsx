import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeleteWorkDialog } from '@/components/business/works/delete-work-dialog';

describe('DeleteWorkDialog', () => {
	const onOpenChange = jest.fn();
	const onConfirm = jest.fn().mockResolvedValue(undefined);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders nothing when closed', () => {
		const { container } = render(
			<DeleteWorkDialog
				isOpen={false}
				onOpenChange={onOpenChange}
				onConfirm={onConfirm}
				workName="Nombre de obra"
			/>
		);

		expect(container.textContent).toBe('');
	});

	it('shows work address in description', () => {
		render(
			<DeleteWorkDialog
				isOpen={true}
				onOpenChange={onOpenChange}
				onConfirm={onConfirm}
				workName="Nombre de obra"
			/>
		);

		expect(screen.getByText(/Nombre de obra/)).toBeInTheDocument();
	});

	it('renders title and cancel button', () => {
		render(
			<DeleteWorkDialog
				isOpen={true}
				onOpenChange={onOpenChange}
				onConfirm={onConfirm}
				workName="Nombre de obra"
			/>
		);

		expect(screen.getByText('Eliminar obra')).toBeInTheDocument();
		expect(screen.getByText('Cancelar')).toBeInTheDocument();
		expect(screen.getByText('Eliminar')).toBeInTheDocument();
	});

	it('calls onConfirm when delete is clicked', async () => {
		render(
			<DeleteWorkDialog
				isOpen={true}
				onOpenChange={onOpenChange}
				onConfirm={onConfirm}
				workName="Nombre de obra"
			/>
		);

		fireEvent.click(screen.getByText('Eliminar'));

		await waitFor(() => {
			expect(onConfirm).toHaveBeenCalledTimes(1);
		});
	});

	it('shows "Eliminando..." while deleting', async () => {
		onConfirm.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

		render(
			<DeleteWorkDialog
				isOpen={true}
				onOpenChange={onOpenChange}
				onConfirm={onConfirm}
				workName="Nombre de obra"
			/>
		);

		fireEvent.click(screen.getByText('Eliminar'));

		expect(screen.getByText('Eliminando...')).toBeInTheDocument();
	});

	it('disables buttons while deleting', async () => {
		onConfirm.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

		render(
			<DeleteWorkDialog
				isOpen={true}
				onOpenChange={onOpenChange}
				onConfirm={onConfirm}
				workName="Nombre de obra"
			/>
		);

		fireEvent.click(screen.getByText('Eliminar'));

		expect(screen.getByText('Cancelar')).toBeDisabled();
		expect(screen.getByText('Eliminando...')).toBeDisabled();
	});

	it('calls onOpenChange(false) when cancel is clicked', () => {
		render(
			<DeleteWorkDialog
				isOpen={true}
				onOpenChange={onOpenChange}
				onConfirm={onConfirm}
				workName="Nombre de obra"
			/>
		);

		fireEvent.click(screen.getByText('Cancelar'));
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});
