import { render, screen, fireEvent, within } from '@testing-library/react';
import { IncomeExpenseFilterDialog } from '@/components/business/cash-flow/income-expense-filter-dialog';
import type { Work } from '@/lib/works/works';
import type { PartyOption } from '@/hooks/income-expense/use-income-expense-tab';

jest.mock('@/components/ui/select', () => ({
	Select: ({ children, onValueChange }: any) => (
		<select data-testid="select-native" onChange={(e) => onValueChange?.(e.target.value)}>
			{children}
		</select>
	),
	SelectTrigger: ({ children }: any) => <>{children}</>,
	SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
	SelectContent: ({ children }: any) => <>{children}</>,
	SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));

const WORKS: Work[] = [
	{ id: 1, name: 'Obra A', client_id: 1 },
	{ id: 2, name: 'Obra B', client_id: 2 },
];

const PARTIES: PartyOption[] = [
	{ id: 1, name: 'Cliente 1' },
	{ id: 2, name: 'Cliente 2' },
];

function baseProps(over: Partial<React.ComponentProps<typeof IncomeExpenseFilterDialog>> = {}) {
	return {
		open: true,
		onOpenChange: jest.fn(),
		partyLabel: 'Cliente',
		dateFrom: '',
		onDateFromChange: jest.fn(),
		dateTo: '',
		onDateToChange: jest.fn(),
		workId: '',
		onWorkIdChange: jest.fn(),
		works: WORKS,
		partyId: '',
		onPartyIdChange: jest.fn(),
		parties: PARTIES,
		categoryId: '',
		onCategoryIdChange: jest.fn(),
		categories: [],
		onClear: jest.fn(),
		...over,
	};
}

// Selects render in DOM order: Obra, (party label), Categoría.
const selects = () => screen.getAllByTestId('select-native');

describe('IncomeExpenseFilterDialog', () => {
	it('renders the date, work, party and category fields', () => {
		render(<IncomeExpenseFilterDialog {...baseProps()} />);

		expect(screen.getByLabelText('Desde')).toBeInTheDocument();
		expect(screen.getByLabelText('Hasta')).toBeInTheDocument();
		expect(screen.getByText('Obra')).toBeInTheDocument();
		expect(screen.getByText('Cliente')).toBeInTheDocument();
		expect(screen.getByText('Categoría')).toBeInTheDocument();
		expect(selects()).toHaveLength(3);
	});

	it('updates the date range through onDateFromChange/onDateToChange', () => {
		const props = baseProps();
		render(<IncomeExpenseFilterDialog {...props} />);

		fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-01-01' } });
		expect(props.onDateFromChange).toHaveBeenCalledWith('2026-01-01');

		fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-01-31' } });
		expect(props.onDateToChange).toHaveBeenCalledWith('2026-01-31');
	});

	it('calls onClear when "Limpiar filtros" is clicked', () => {
		const props = baseProps();
		render(<IncomeExpenseFilterDialog {...props} />);

		fireEvent.click(screen.getByText('Limpiar filtros'));

		expect(props.onClear).toHaveBeenCalledTimes(1);
	});

	it('closes the dialog when "Aceptar" is clicked', () => {
		const props = baseProps();
		render(<IncomeExpenseFilterDialog {...props} />);

		fireEvent.click(screen.getByText('Aceptar'));

		expect(props.onOpenChange).toHaveBeenCalledWith(false);
	});

	it('filters the work options by the selected client when partyLabel is Cliente', () => {
		render(<IncomeExpenseFilterDialog {...baseProps({ partyId: '1' })} />);

		const workSelect = within(selects()[0]);
		expect(workSelect.getByText('Obra A')).toBeInTheDocument();
		expect(workSelect.queryByText('Obra B')).not.toBeInTheDocument();
	});

	it('does not filter the work options when partyLabel is Proveedor', () => {
		render(<IncomeExpenseFilterDialog {...baseProps({ partyLabel: 'Proveedor', partyId: '1' })} />);

		const workSelect = within(selects()[0]);
		expect(workSelect.getByText('Obra A')).toBeInTheDocument();
		expect(workSelect.getByText('Obra B')).toBeInTheDocument();
	});

	it('resets the selected work when the client changes to one that does not own it', () => {
		const props = baseProps({ workId: '1', partyId: '1' });
		render(<IncomeExpenseFilterDialog {...props} />);

		const partySelect = selects()[1];
		fireEvent.change(partySelect, { target: { value: '2' } });

		expect(props.onPartyIdChange).toHaveBeenCalledWith('2');
		expect(props.onWorkIdChange).toHaveBeenCalledWith('');
	});

	it('does not touch the work when the new client still owns the selected work', () => {
		const props = baseProps({ workId: '1', partyId: '1' });
		render(<IncomeExpenseFilterDialog {...props} />);

		const partySelect = selects()[1];
		fireEvent.change(partySelect, { target: { value: '1' } });

		expect(props.onPartyIdChange).toHaveBeenCalledWith('1');
		expect(props.onWorkIdChange).not.toHaveBeenCalled();
	});
});
