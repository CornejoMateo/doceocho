import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { CategoriesConfig } from '@/components/business/cash-flow/categories-config';
import {
	CashFlowCategory,
	listCategories,
	createCategory,
	deactivateCategory,
} from '@/lib/categories/categories';

const mockToast = jest.fn();

jest.mock('@/components/ui/use-toast', () => ({
	useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/lib/categories/categories', () => ({
	listCategories: jest.fn(),
	createCategory: jest.fn(),
	updateCategory: jest.fn(),
	deactivateCategory: jest.fn(),
	reactivateCategory: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: jest.fn(),
}));

const makeCategory = (over: Partial<CashFlowCategory> = {}): CashFlowCategory => ({
	id: 1,
	created_at: '2026-10-09T00:00:00Z',
	name: 'Sueldos',
	kind: 'expense',
	is_active: true,
	...over,
});

const ACTIVE_CATEGORY = makeCategory();

const props = {
	kind: 'expense' as const,
	title: 'Categorías de gastos',
	triggerLabel: 'Configurar categorías',
	newLabel: 'Nueva categoría',
	emptyLabel: 'No hay categorías de gastos registradas',
};

function renderConfig() {
	return render(<CategoriesConfig {...props} />);
}

const openDialog = () =>
	fireEvent.click(screen.getByRole('button', { name: 'Configurar categorías' }));

const nameInput = () => screen.getByLabelText('Nombre');

const submitForm = () => fireEvent.submit(nameInput().closest('form')!);

const openWith = async (categories: CashFlowCategory[]) => {
	(listCategories as jest.Mock).mockResolvedValue({ data: categories, error: null });
	renderConfig();
	openDialog();
	await waitFor(() => {
		expect(screen.queryByText('Cargando...')).not.toBeInTheDocument();
	});
};

describe('CategoriesConfig', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(createCategory as jest.Mock).mockResolvedValue({ data: ACTIVE_CATEGORY, error: null });
		(deactivateCategory as jest.Mock).mockResolvedValue({ data: ACTIVE_CATEGORY, error: null });
	});

	it('opens the dialog and lists categories fetched for the given kind', async () => {
		await openWith([ACTIVE_CATEGORY]);

		expect(listCategories).toHaveBeenCalledWith('expense');
		expect(screen.getByText('Sueldos')).toBeInTheDocument();
	});

	it('shows the empty label when there are no categories', async () => {
		await openWith([]);

		expect(screen.getByText('No hay categorías de gastos registradas')).toBeInTheDocument();
	});

	it('creates a category with the name trimmed before submitting', async () => {
		await openWith([]);
		fireEvent.click(screen.getByText('Nueva categoría'));
		fireEvent.change(nameInput(), { target: { value: '  Impuestos  ' } });

		submitForm();

		await waitFor(() => {
			expect(createCategory).toHaveBeenCalledWith({ name: 'Impuestos', kind: 'expense' });
		});
	});

	it('asks for confirmation before deactivating and calls deactivateCategory on confirm', async () => {
		await openWith([ACTIVE_CATEGORY]);

		fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

		const alertDialog = within(screen.getByRole('alertdialog'));
		expect(alertDialog.getByText('¿Desactivar categoría?')).toBeInTheDocument();
		expect(deactivateCategory).not.toHaveBeenCalled();

		fireEvent.click(alertDialog.getByText('Desactivar'));

		await waitFor(() => {
			expect(deactivateCategory).toHaveBeenCalledWith(1);
		});
	});
});
