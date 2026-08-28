import { render, screen, fireEvent } from '@testing-library/react';
import { BudgetDetailModal } from '@/components/business/budgets/BudgetDetailModal';
import { BudgetWithWork } from '@/lib/balances/balances';

const mockBudget = {
	id: 1,
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
		work_id: 5,
		work: { address: 'Calle 123', locality: 'Bs As', name: 'Obra 1' },
	},
} as BudgetWithWork;

jest.mock('@/components/ui/budget-status-selector', () => ({
	BudgetStatusSelector: ({ value, onValueChange, disabled }: any) => (
		<select
			data-testid="status-selector"
			value={value}
			onChange={(e) => onValueChange(e.target.value)}
			disabled={disabled}
		>
			<option value="in_progress">En proceso</option>
			<option value="sold">Vendido</option>
			<option value="lost">Perdido</option>
		</select>
	),
}));

describe('BudgetDetailModal', () => {
	const onOpenChange = jest.fn();
	const onEdit = jest.fn();
	const onChooseBudget = jest.fn();
	const onViewPdf = jest.fn();
	const onStatusChange = jest.fn();
	const onClose = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns null when budget is null', () => {
		const { container } = render(
			<BudgetDetailModal
				isOpen={true}
				onOpenChange={onOpenChange}
				budget={null}
				isLoading={false}
				onEdit={onEdit}
				onChooseBudget={onChooseBudget}
				onViewPdf={onViewPdf}
				onStatusChange={onStatusChange}
				onClose={onClose}
			/>
		);

		expect(container.textContent).toBe('');
	});

	it('renders budget type and number', () => {
		render(
			<BudgetDetailModal
				isOpen={true}
				onOpenChange={onOpenChange}
				budget={mockBudget}
				isLoading={false}
				onEdit={onEdit}
				onChooseBudget={onChooseBudget}
				onViewPdf={onViewPdf}
				onStatusChange={onStatusChange}
				onClose={onClose}
			/>
		);

		expect(screen.getByText('MDF')).toBeInTheDocument();
		expect(screen.getByText('#001')).toBeInTheDocument();
	});

	it('shows work address', () => {
		render(
			<BudgetDetailModal
				isOpen={true}
				onOpenChange={onOpenChange}
				budget={mockBudget}
				isLoading={false}
				onEdit={onEdit}
				onChooseBudget={onChooseBudget}
				onViewPdf={onViewPdf}
				onStatusChange={onStatusChange}
				onClose={onClose}
			/>
		);

		expect(screen.getByText('Obra 1')).toBeInTheDocument();
	});

	it('shows "Sin obra asignada" when budget has no work', () => {
		const budgetNoWork = {
			...mockBudget,
			folder_budget: { id: 1, work_id: null, work: null },
		} as unknown as BudgetWithWork;

		render(
			<BudgetDetailModal
				isOpen={true}
				onOpenChange={onOpenChange}
				budget={budgetNoWork}
				isLoading={false}
				onEdit={onEdit}
				onChooseBudget={onChooseBudget}
				onViewPdf={onViewPdf}
				onStatusChange={onStatusChange}
				onClose={onClose}
			/>
		);

		expect(screen.getByText('Sin obra asignada')).toBeInTheDocument();
	});

	it('shows "Borrador - Sin PDF" when no pdf_path', () => {
		render(
			<BudgetDetailModal
				isOpen={true}
				onOpenChange={onOpenChange}
				budget={mockBudget}
				isLoading={false}
				onEdit={onEdit}
				onChooseBudget={onChooseBudget}
				onViewPdf={onViewPdf}
				onStatusChange={onStatusChange}
				onClose={onClose}
			/>
		);

		expect(screen.getByText('Borrador - Sin PDF')).toBeInTheDocument();
	});

	it('shows PDF button when pdf_path exists', () => {
		const budgetWithPdf = {
			...mockBudget,
			pdf_path: 'path/to/file.pdf',
			pdf_url: 'https://example.com/file.pdf',
		} as BudgetWithWork;

		render(
			<BudgetDetailModal
				isOpen={true}
				onOpenChange={onOpenChange}
				budget={budgetWithPdf}
				isLoading={false}
				onEdit={onEdit}
				onChooseBudget={onChooseBudget}
				onViewPdf={onViewPdf}
				onStatusChange={onStatusChange}
				onClose={onClose}
			/>
		);

		expect(screen.getByText('Ver PDF')).toBeInTheDocument();
	});

	it('calls onEdit when edit button is clicked', () => {
		render(
			<BudgetDetailModal
				isOpen={true}
				onOpenChange={onOpenChange}
				budget={mockBudget}
				isLoading={false}
				onEdit={onEdit}
				onChooseBudget={onChooseBudget}
				onViewPdf={onViewPdf}
				onStatusChange={onStatusChange}
				onClose={onClose}
			/>
		);

		fireEvent.click(screen.getByText('Editar'));
		expect(onEdit).toHaveBeenCalledWith(mockBudget);
	});

	it('shows "Elegir" button when not accepted', () => {
		render(
			<BudgetDetailModal
				isOpen={true}
				onOpenChange={onOpenChange}
				budget={mockBudget}
				isLoading={false}
				onEdit={onEdit}
				onChooseBudget={onChooseBudget}
				onViewPdf={onViewPdf}
				onStatusChange={onStatusChange}
				onClose={onClose}
			/>
		);

		expect(screen.getByText('Elegir')).toBeInTheDocument();
	});

	it('hides "Elegir" button when already accepted', () => {
		const acceptedBudget = { ...mockBudget, accepted: true } as BudgetWithWork;

		render(
			<BudgetDetailModal
				isOpen={true}
				onOpenChange={onOpenChange}
				budget={acceptedBudget}
				isLoading={false}
				onEdit={onEdit}
				onChooseBudget={onChooseBudget}
				onViewPdf={onViewPdf}
				onStatusChange={onStatusChange}
				onClose={onClose}
			/>
		);

		expect(screen.queryByText('Elegir')).not.toBeInTheDocument();
	});

	it('calls onChooseBudget and onClose when "Elegir" is clicked', () => {
		render(
			<BudgetDetailModal
				isOpen={true}
				onOpenChange={onOpenChange}
				budget={mockBudget}
				isLoading={false}
				onEdit={onEdit}
				onChooseBudget={onChooseBudget}
				onViewPdf={onViewPdf}
				onStatusChange={onStatusChange}
				onClose={onClose}
			/>
		);

		fireEvent.click(screen.getByText('Elegir'));
		expect(onChooseBudget).toHaveBeenCalledWith(1);
		expect(onClose).toHaveBeenCalled();
	});

	it('calls onClose when "Cerrar" is clicked', () => {
		render(
			<BudgetDetailModal
				isOpen={true}
				onOpenChange={onOpenChange}
				budget={mockBudget}
				isLoading={false}
				onEdit={onEdit}
				onChooseBudget={onChooseBudget}
				onViewPdf={onViewPdf}
				onStatusChange={onStatusChange}
				onClose={onClose}
			/>
		);

		fireEvent.click(screen.getByText('Cerrar'));
		expect(onClose).toHaveBeenCalled();
	});

	it('calls onStatusChange when status selector changes', () => {
		render(
			<BudgetDetailModal
				isOpen={true}
				onOpenChange={onOpenChange}
				budget={mockBudget}
				isLoading={false}
				onEdit={onEdit}
				onChooseBudget={onChooseBudget}
				onViewPdf={onViewPdf}
				onStatusChange={onStatusChange}
				onClose={onClose}
			/>
		);

		const select = screen.getByTestId('status-selector');
		fireEvent.change(select, { target: { value: 'sold' } });
		expect(onStatusChange).toHaveBeenCalledWith(1, 'sold');
	});
});
