import { render, screen, fireEvent } from '@testing-library/react';
import { IncomeExpenseFilters } from '@/components/business/cash-flow/income-expense-filters';

const noop = () => {};

function baseProps() {
	return {
		addLabel: 'Nuevo ingreso',
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
		search: '',
		onSearchChange: jest.fn(),
		onClear: noop,
		activeFilterCount: 0,
		filterDialogOpen: false,
		onFilterDialogOpenChange: jest.fn(),
	};
}

describe('IncomeExpenseFilters', () => {
	it('calls onSearchChange as the user types in the search input', () => {
		const props = baseProps();
		render(<IncomeExpenseFilters {...props} />);

		fireEvent.change(screen.getByPlaceholderText('N° comprobante o detalle'), {
			target: { value: 'Factura' },
		});

		expect(props.onSearchChange).toHaveBeenCalledWith('Factura');
	});

	it('opens the filter dialog when "Filtros" is clicked', () => {
		const props = baseProps();
		render(<IncomeExpenseFilters {...props} />);

		fireEvent.click(screen.getByRole('button', { name: 'Filtros' }));

		expect(props.onFilterDialogOpenChange).toHaveBeenCalledWith(true);
	});

	it('does not show a badge when there are no active filters', () => {
		const props = baseProps();
		render(<IncomeExpenseFilters {...props} />);

		const filterButton = screen.getByRole('button', { name: 'Filtros' });
		expect(filterButton.textContent).not.toMatch(/\d/);
	});

	it('shows a badge with the active filter count when greater than zero', () => {
		const props = baseProps();
		render(<IncomeExpenseFilters {...props} activeFilterCount={3} />);

		const filterButton = screen.getByRole('button', { name: 'Filtros 3' });
		expect(filterButton).toHaveTextContent('3');
	});

	it('calls onAdd with the add label rendered on the button', () => {
		const props = baseProps();
		render(<IncomeExpenseFilters {...props} />);

		fireEvent.click(screen.getByRole('button', { name: 'Nuevo ingreso' }));

		expect(props.onAdd).toHaveBeenCalledTimes(1);
	});
});
