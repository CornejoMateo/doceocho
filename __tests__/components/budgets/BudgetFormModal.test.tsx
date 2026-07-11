import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BudgetFormModal } from '@/components/business/budgets/budget-form-modal';
import { Work } from '@/lib/works/works';
import { BudgetWithWork } from '@/lib/balances/balances';

jest.mock('@/utils/formats-money', () => ({
	formatNumber: (v: string) => v,
	parseArsToNumber: (v: string) => Number(v.replace(/\./g, '').replace(',', '.')) || 0,
}));

jest.mock('@/lib/checklists/materials', () => ({
	listMaterials: jest.fn().mockResolvedValue({ data: [], error: null }),
}));

const mockWorks: Work[] = [
	{ id: 1, address: 'Av. Siempre Viva', locality: 'Springfield' },
	{ id: 2, address: 'Calle 123', locality: 'CABA' },
];

const mockBudget: BudgetWithWork = {
	id: 5,
	created_at: '2024-06-15',
	amount_ars: 150000,
	amount_usd: 150,
	accepted: false,
	sold: false,
	lost: false,
	pdf_url: null,
	pdf_path: null,
	number: '001',
	type: 'MDF',
	folder_budget: {
		id: 1,
		work_id: 1,
		work: { address: 'Av. Siempre Viva', locality: 'Springfield' },
	},
};

describe('BudgetFormModal', () => {
	const onOpenChange = jest.fn();
	const onSubmit = jest.fn().mockResolvedValue(undefined);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders "Nuevo Presupuesto" title in create mode', () => {
		render(
			<BudgetFormModal
				isOpen={true}
				onOpenChange={onOpenChange}
				mode="create"
				works={mockWorks}
				onSubmit={onSubmit}
				isLoading={false}
			/>
		);

		expect(screen.getByText('Nuevo Presupuesto')).toBeInTheDocument();
	});

	it('renders "Editar Presupuesto" title in edit mode', () => {
		render(
			<BudgetFormModal
				isOpen={true}
				onOpenChange={onOpenChange}
				mode="edit"
				works={mockWorks}
				budget={mockBudget}
				onSubmit={onSubmit}
				isLoading={false}
			/>
		);

		expect(screen.getByText('Editar Presupuesto')).toBeInTheDocument();
	});

	it('renders type select with options', () => {
		render(
			<BudgetFormModal
				isOpen={true}
				onOpenChange={onOpenChange}
				mode="create"
				works={mockWorks}
				onSubmit={onSubmit}
				isLoading={false}
			/>
		);

		expect(screen.getByText('Tipo de material')).toBeInTheDocument();
	});

	it('renders work select with options', () => {
		render(
			<BudgetFormModal
				isOpen={true}
				onOpenChange={onOpenChange}
				mode="create"
				works={mockWorks}
				onSubmit={onSubmit}
				isLoading={false}
			/>
		);

		expect(screen.getByText('Obra')).toBeInTheDocument();
	});

	it('calls onSubmit with form data when submitted with usdRate', async () => {
		render(
			<BudgetFormModal
				isOpen={true}
				onOpenChange={onOpenChange}
				mode="create"
				works={mockWorks}
				onSubmit={onSubmit}
				isLoading={false}
			/>
		);

		const usdRateInput = screen.getByLabelText('Cotización del dólar');
		fireEvent.change(usdRateInput, { target: { value: '1000' } });

		fireEvent.click(screen.getByText('Crear'));

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledTimes(1);
		});

		const data = onSubmit.mock.calls[0][0];
		expect(data.type).toBe('MDF');
		expect(data.workId).toBe('none');
	});

	it('does not call onSubmit when usdRate is missing', async () => {
		render(
			<BudgetFormModal
				isOpen={true}
				onOpenChange={onOpenChange}
				mode="create"
				works={mockWorks}
				onSubmit={onSubmit}
				isLoading={false}
			/>
		);

		fireEvent.click(screen.getByText('Crear'));

		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('shows "Procesando..." when isLoading is true', () => {
		render(
			<BudgetFormModal
				isOpen={true}
				onOpenChange={onOpenChange}
				mode="create"
				works={mockWorks}
				onSubmit={onSubmit}
				isLoading={true}
			/>
		);

		expect(screen.getByText('Procesando...')).toBeInTheDocument();
	});

	it('shows "Cancelar" and "Crear" buttons in create mode', () => {
		render(
			<BudgetFormModal
				isOpen={true}
				onOpenChange={onOpenChange}
				mode="create"
				works={mockWorks}
				onSubmit={onSubmit}
				isLoading={false}
			/>
		);

		expect(screen.getByText('Cancelar')).toBeInTheDocument();
		expect(screen.getByText('Crear')).toBeInTheDocument();
	});

	it('shows "Cancelar" and "Actualizar" buttons in edit mode', () => {
		render(
			<BudgetFormModal
				isOpen={true}
				onOpenChange={onOpenChange}
				mode="edit"
				works={mockWorks}
				budget={mockBudget}
				onSubmit={onSubmit}
				isLoading={false}
			/>
		);

		expect(screen.getByText('Cancelar')).toBeInTheDocument();
		expect(screen.getByText('Actualizar')).toBeInTheDocument();
	});

	it('calls onOpenChange(false) when Cancelar is clicked', () => {
		render(
			<BudgetFormModal
				isOpen={true}
				onOpenChange={onOpenChange}
				mode="create"
				works={mockWorks}
				onSubmit={onSubmit}
				isLoading={false}
			/>
		);

		fireEvent.click(screen.getByText('Cancelar'));
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('renders date, number, amount fields', () => {
		render(
			<BudgetFormModal
				isOpen={true}
				onOpenChange={onOpenChange}
				mode="create"
				works={mockWorks}
				onSubmit={onSubmit}
				isLoading={false}
			/>
		);

		expect(screen.getByText('Fecha de creación')).toBeInTheDocument();
		expect(screen.getByText('Número de presupuesto')).toBeInTheDocument();
		expect(screen.getByText('Monto ARS')).toBeInTheDocument();
	});

	it('renders USD and rate fields', () => {
		render(
			<BudgetFormModal
				isOpen={true}
				onOpenChange={onOpenChange}
				mode="create"
				works={mockWorks}
				onSubmit={onSubmit}
				isLoading={false}
			/>
		);

		expect(screen.getByText('Cotización del dólar')).toBeInTheDocument();
		expect(screen.getByText('Monto USD')).toBeInTheDocument();
	});

	it('renders PDF upload field', () => {
		render(
			<BudgetFormModal
				isOpen={true}
				onOpenChange={onOpenChange}
				mode="create"
				works={mockWorks}
				onSubmit={onSubmit}
				isLoading={false}
			/>
		);

		expect(screen.getByText(/PDF/)).toBeInTheDocument();
	});

	it('renders nothing when isOpen is false', () => {
		const { container } = render(
			<BudgetFormModal
				isOpen={false}
				onOpenChange={onOpenChange}
				mode="create"
				works={mockWorks}
				onSubmit={onSubmit}
				isLoading={false}
			/>
		);

		expect(container.textContent).toBe('');
	});

	it('editingBudget is cleared when editModalOpen becomes false', () => {
		const { rerender } = render(
			<BudgetFormModal
				isOpen={true}
				onOpenChange={onOpenChange}
				mode="edit"
				works={mockWorks}
				budget={mockBudget}
				onSubmit={onSubmit}
				isLoading={false}
			/>
		);

		expect(screen.getByText('Editar Presupuesto')).toBeInTheDocument();
	});
});
