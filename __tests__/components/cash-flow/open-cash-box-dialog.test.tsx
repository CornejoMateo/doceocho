import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OpenCashBoxDialog } from '@/components/business/cash-flow/open-cash-box-dialog';

jest.mock('@/utils/formats-money', () => ({
	formatNumber: (v: string) => v,
	parseArsToNumber: (v: string) => (v === '' ? NaN : Number(v)),
}));

function renderDialog(overrides = {}) {
	const props = {
		open: true,
		onOpenChange: jest.fn(),
		onOpenCashBox: jest.fn().mockResolvedValue(undefined),
		...overrides,
	};
	render(<OpenCashBoxDialog {...props} />);
	return props;
}

describe('OpenCashBoxDialog', () => {
	it('does not render dialog content when closed', () => {
		renderDialog({ open: false });

		expect(screen.queryByText('Abrir caja')).not.toBeInTheDocument();
	});

	it('renders the title, description, and empty input when open', () => {
		renderDialog();

		expect(screen.getByRole('heading', { name: 'Abrir caja' })).toBeInTheDocument();
		expect(
			screen.getByText('Ingresá el saldo inicial con el que comenzará la caja.')
		).toBeInTheDocument();
		expect(screen.getByLabelText('Saldo inicial')).toHaveValue('');
	});

	it('updates the input value as the user types', () => {
		renderDialog();

		const input = screen.getByLabelText('Saldo inicial');
		fireEvent.change(input, { target: { value: '50000' } });

		expect(input).toHaveValue('50000');
	});

	it('clears the opening balance when the dialog closes and reopens', () => {
		const { rerender } = render(
			<OpenCashBoxDialog open={true} onOpenChange={jest.fn()} onOpenCashBox={jest.fn()} />
		);

		fireEvent.change(screen.getByLabelText('Saldo inicial'), {
			target: { value: '50000' },
		});
		expect(screen.getByLabelText('Saldo inicial')).toHaveValue('50000');

		rerender(<OpenCashBoxDialog open={false} onOpenChange={jest.fn()} onOpenCashBox={jest.fn()} />);
		rerender(<OpenCashBoxDialog open={true} onOpenChange={jest.fn()} onOpenCashBox={jest.fn()} />);

		expect(screen.getByLabelText('Saldo inicial')).toHaveValue('');
	});

	it('calls onOpenChange(false) when cancel is clicked', () => {
		const onOpenChange = jest.fn();
		renderDialog({ onOpenChange });

		fireEvent.click(screen.getByText('Cancelar'));

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('submits the parsed balance and closes the dialog on success', async () => {
		const onOpenCashBox = jest.fn().mockResolvedValue(undefined);
		const onOpenChange = jest.fn();
		renderDialog({ onOpenCashBox, onOpenChange });

		fireEvent.change(screen.getByLabelText('Saldo inicial'), {
			target: { value: '75000' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Abrir caja' }));

		await waitFor(() => {
			expect(onOpenCashBox).toHaveBeenCalledWith(75000);
		});
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('defaults to 0 when the opening balance is empty', async () => {
		const onOpenCashBox = jest.fn().mockResolvedValue(undefined);
		renderDialog({ onOpenCashBox });

		fireEvent.click(screen.getByRole('button', { name: 'Abrir caja' }));

		await waitFor(() => {
			expect(onOpenCashBox).toHaveBeenCalledWith(0);
		});
	});

	it('shows "Abriendo..." and disables the button while submitting', async () => {
		let resolvePromise: (value: any) => void;
		const onOpenCashBox = jest.fn(
			() =>
				new Promise((resolve) => {
					resolvePromise = resolve;
				})
		);
		renderDialog({ onOpenCashBox });

		fireEvent.change(screen.getByLabelText('Saldo inicial'), {
			target: { value: '10000' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Abrir caja' }));

		expect(await screen.findByText('Abriendo...')).toBeDisabled();

		resolvePromise!(undefined);

		await waitFor(() => {
			expect(screen.queryByText('Abriendo...')).not.toBeInTheDocument();
		});
	});
});
