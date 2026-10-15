import { render, screen, fireEvent, within } from '@testing-library/react';
import { FixedExpensePaymentsList } from '@/components/business/cash-flow/fixed-expenses/fixed-expense-payments-list';
import { FixedExpensePaymentWithDetails } from '@/lib/fixed-expenses/fixed-expense-payments';

function makePayment(id: number): FixedExpensePaymentWithDetails {
	return {
		id,
		created_at: '2026-10-09T00:00:00Z',
		fixed_expense_id: 1,
		paid_date: '2026-10-05',
		period: '2026-10-01',
		net_amount: 1000 * id,
		iva_percent: 0,
		iva_amount: 0,
		total_amount: 1000 * id,
		payment_method_id: 7,
		bank_account_id: null,
		description: `Pago ${id}`,
		category_id: 10,
		category_name: 'Alquiler oficina',
		payment_method_name: 'Efectivo',
		bank_account_label: null,
	};
}

const noop = () => {};

describe('FixedExpensePaymentsList', () => {
	it('renders an Acciones column and calls onEdit/onDelete with the clicked payment', () => {
		const payment = makePayment(1);
		const onEdit = jest.fn();
		const onDelete = jest.fn();

		render(
			<FixedExpensePaymentsList
				payments={[payment]}
				loading={false}
				error={null}
				onRetry={noop}
				year={2026}
				onEdit={onEdit}
				onDelete={onDelete}
			/>
		);

		const desktop = within(screen.getByTestId('fixed-expense-payments-desktop'));
		expect(desktop.getByText('Acciones')).toBeInTheDocument();

		fireEvent.click(desktop.getByRole('button', { name: 'Editar pago' }));
		expect(onEdit).toHaveBeenCalledWith(payment);

		fireEvent.click(desktop.getByRole('button', { name: 'Eliminar pago' }));
		expect(onDelete).toHaveBeenCalledWith(payment);
	});

	it('shows only 10 payments per page and navigates to the next page', () => {
		const payments = Array.from({ length: 12 }, (_, i) => makePayment(i + 1));

		render(
			<FixedExpensePaymentsList
				payments={payments}
				loading={false}
				error={null}
				onRetry={noop}
				year={2026}
				onEdit={noop}
				onDelete={noop}
			/>
		);

		const desktop = within(screen.getByTestId('fixed-expense-payments-desktop'));
		expect(desktop.getByText('Pago 1')).toBeInTheDocument();
		expect(desktop.getByText('Pago 10')).toBeInTheDocument();
		expect(desktop.queryByText('Pago 11')).not.toBeInTheDocument();
		expect(screen.getByText('Mostrando 1-10 de 12 pagos')).toBeInTheDocument();

		fireEvent.click(screen.getByText('Siguiente'));

		expect(desktop.getByText('Pago 11')).toBeInTheDocument();
		expect(desktop.getByText('Pago 12')).toBeInTheDocument();
		expect(desktop.queryByText('Pago 1')).not.toBeInTheDocument();
	});

	it('hides the pager when there is a single page', () => {
		const payments = Array.from({ length: 5 }, (_, i) => makePayment(i + 1));

		render(
			<FixedExpensePaymentsList
				payments={payments}
				loading={false}
				error={null}
				onRetry={noop}
				year={2026}
				onEdit={noop}
				onDelete={noop}
			/>
		);

		expect(screen.queryByText('Siguiente')).not.toBeInTheDocument();
	});

	it('resets to page 1 when the year changes', () => {
		const payments = Array.from({ length: 12 }, (_, i) => makePayment(i + 1));

		const { rerender } = render(
			<FixedExpensePaymentsList
				payments={payments}
				loading={false}
				error={null}
				onRetry={noop}
				year={2026}
				onEdit={noop}
				onDelete={noop}
			/>
		);

		const desktop = within(screen.getByTestId('fixed-expense-payments-desktop'));
		fireEvent.click(screen.getByText('Siguiente'));
		expect(desktop.getByText('Pago 11')).toBeInTheDocument();

		const nextYearPayments = Array.from({ length: 12 }, (_, i) => makePayment(100 + i + 1));
		rerender(
			<FixedExpensePaymentsList
				payments={nextYearPayments}
				loading={false}
				error={null}
				onRetry={noop}
				year={2027}
				onEdit={noop}
				onDelete={noop}
			/>
		);

		expect(desktop.getByText('Pago 101')).toBeInTheDocument();
		expect(desktop.queryByText('Pago 111')).not.toBeInTheDocument();
	});
});
