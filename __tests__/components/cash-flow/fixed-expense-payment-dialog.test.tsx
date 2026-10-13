import { render, screen } from '@testing-library/react';
import { FixedExpensePaymentDialog } from '@/components/business/cash-flow/fixed-expense-payment-dialog';
import { getLocalDate } from '@/utils/format-date';

const noop = () => {};

function setup() {
	return render(
		<FixedExpensePaymentDialog
			open
			onOpenChange={noop}
			expenseToPay={null}
			paymentToEdit={null}
			paymentMonth=""
			setPaymentMonth={noop}
			paymentDate=""
			setPaymentDate={noop}
			paymentNet=""
			setPaymentNet={noop}
			paymentIvaPercent="21"
			setPaymentIvaPercent={noop}
			paymentTotal={0}
			paymentMethodId=""
			setPaymentMethodId={noop}
			activePaymentMethods={[]}
			paymentBankAccountId="none"
			setPaymentBankAccountId={noop}
			bankAccounts={[]}
			payingSaving={false}
			onSubmit={noop}
		/>
	);
}

describe('FixedExpensePaymentDialog', () => {
	it('limits the month input to one year ahead of the current year', () => {
		setup();
		const currentYear = Number(getLocalDate().slice(0, 4));
		expect(screen.getByLabelText('Mes')).toHaveAttribute('max', `${currentYear + 1}-12`);
	});
});
