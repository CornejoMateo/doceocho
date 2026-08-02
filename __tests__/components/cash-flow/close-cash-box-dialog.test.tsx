import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CloseCashBoxDialog } from '@/components/business/cash-flow/close-cash-box-dialog';

jest.mock('@/utils/formats-money', () => ({
	formatCurrency: (v: number) => `$${v}`,
}));

function renderDialog(overrides = {}) {
	const props = {
		open: true,
		onOpenChange: jest.fn(),
		currentBalance: 125000,
		onCloseCashBox: jest.fn(),
		...overrides,
	};
	render(<CloseCashBoxDialog {...props} />);
	return props;
}

describe('CloseCashBoxDialog', () => {
	it('does not render dialog content when closed', () => {
		renderDialog({ open: false });

		expect(screen.queryByText('Cerrar y reiniciar caja')).not.toBeInTheDocument();
	});

	it('renders the current balance formatted', () => {
		renderDialog({ currentBalance: 125000 });

		expect(screen.getByText('$125000')).toBeInTheDocument();
	});

	it('updates notes as the user types', () => {
		renderDialog();

		const notes = screen.getByLabelText('Notas (opcional)');
		fireEvent.change(notes, { target: { value: 'Cierre de turno tarde' } });

		expect(notes).toHaveValue('Cierre de turno tarde');
	});

	it('calls onCloseCashBox with the current balance and undefined notes when notes are empty', async () => {
		const onCloseCashBox = jest.fn();
		renderDialog({ currentBalance: 90000, onCloseCashBox });

		fireEvent.click(screen.getByText('Cerrar Caja'));

		await waitFor(() => {
			expect(onCloseCashBox).toHaveBeenCalledWith(90000, undefined);
		});
	});

	it('calls onCloseCashBox with the entered notes', async () => {
		const onCloseCashBox = jest.fn();
		renderDialog({ currentBalance: 90000, onCloseCashBox });

		fireEvent.change(screen.getByLabelText('Notas (opcional)'), {
			target: { value: 'Faltante de $500' },
		});
		fireEvent.click(screen.getByText('Cerrar Caja'));

		await waitFor(() => {
			expect(onCloseCashBox).toHaveBeenCalledWith(90000, 'Faltante de $500');
		});
	});

	it('clears the notes field after submitting', async () => {
		renderDialog();

		const notes = screen.getByLabelText('Notas (opcional)');
		fireEvent.change(notes, { target: { value: 'Algo' } });
		fireEvent.click(screen.getByText('Cerrar Caja'));

		await waitFor(() => {
			expect(notes).toHaveValue('');
		});
	});

	it('does NOT call onOpenChange after a successful close', async () => {
		const onOpenChange = jest.fn();
		renderDialog({ onOpenChange });

		fireEvent.click(screen.getByText('Cerrar Caja'));

		await waitFor(() => {
			expect(screen.queryByText('Cerrando...')).not.toBeInTheDocument();
		});
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it('shows "Cerrando..." and disables the button while submitting', async () => {
		let resolvePromise: (value: any) => void;
		const onCloseCashBox = jest.fn(
			() =>
				new Promise((resolve) => {
					resolvePromise = resolve;
				})
		);
		renderDialog({ onCloseCashBox });

		fireEvent.click(screen.getByText('Cerrar Caja'));

		expect(await screen.findByText('Cerrando...')).toBeDisabled();

		resolvePromise!(undefined);

		await waitFor(() => {
			expect(screen.queryByText('Cerrando...')).not.toBeInTheDocument();
		});
	});

	it('calls onOpenChange(false) and clears notes when cancel is clicked', () => {
		const onOpenChange = jest.fn();
		renderDialog({ onOpenChange });

		const notes = screen.getByLabelText('Notas (opcional)');
		fireEvent.change(notes, { target: { value: 'Borrador' } });
		fireEvent.click(screen.getByText('Cancelar'));

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});
