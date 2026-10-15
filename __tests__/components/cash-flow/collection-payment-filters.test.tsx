import { render, screen, fireEvent } from '@testing-library/react';
import { CollectionPaymentFilters } from '@/components/business/cash-flow/collections-payments/collection-payment-filters';

const noop = () => {};

function baseProps() {
	return {
		addLabel: 'Nuevo cobro',
		onAdd: jest.fn(),
		partyLabel: 'Cliente',
		dateFrom: '',
		onDateFromChange: noop,
		dateTo: '',
		onDateToChange: noop,
		workId: '',
		onWorkIdChange: noop,
		works: [],
		partyId: '',
		onPartyIdChange: noop,
		parties: [],
		categoryId: '',
		onCategoryIdChange: noop,
		categories: [],
		paymentMethodId: '',
		onPaymentMethodIdChange: noop,
		paymentMethods: [],
		search: '',
		onSearchChange: jest.fn(),
		onClear: noop,
		activeFilterCount: 0,
		filterDialogOpen: false,
		onFilterDialogOpenChange: jest.fn(),
	};
}

describe('CollectionPaymentFilters', () => {
	it('calls onSearchChange as the user types in the search input', () => {
		const props = baseProps();
		render(<CollectionPaymentFilters {...props} />);

		fireEvent.change(screen.getByPlaceholderText('N° comprobante o detalle'), {
			target: { value: 'Recibo' },
		});

		expect(props.onSearchChange).toHaveBeenCalledWith('Recibo');
	});

	it('opens the filter dialog when "Filtros" is clicked', () => {
		const props = baseProps();
		render(<CollectionPaymentFilters {...props} />);

		fireEvent.click(screen.getByRole('button', { name: 'Filtros' }));

		expect(props.onFilterDialogOpenChange).toHaveBeenCalledWith(true);
	});

	it('does not show a badge when there are no active filters', () => {
		const props = baseProps();
		render(<CollectionPaymentFilters {...props} />);

		const filterButton = screen.getByRole('button', { name: 'Filtros' });
		expect(filterButton.textContent).not.toMatch(/\d/);
	});

	it('shows a badge with the active filter count when greater than zero', () => {
		const props = baseProps();
		render(<CollectionPaymentFilters {...props} activeFilterCount={2} />);

		const filterButton = screen.getByRole('button', { name: 'Filtros 2' });
		expect(filterButton).toHaveTextContent('2');
	});

	it('calls onAdd with the add label rendered on the button', () => {
		const props = baseProps();
		render(<CollectionPaymentFilters {...props} addLabel="Nuevo pago" partyLabel="Proveedor" />);

		fireEvent.click(screen.getByRole('button', { name: 'Nuevo pago' }));

		expect(props.onAdd).toHaveBeenCalledTimes(1);
	});
});
