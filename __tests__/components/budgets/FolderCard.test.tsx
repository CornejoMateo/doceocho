import { render, screen, fireEvent } from '@testing-library/react';
import { FolderCard } from '@/components/business/budgets/FolderCard';
import { BudgetFolderVM } from '@/components/business/reports/budgets/types';
import { Work } from '@/lib/works/works';

const mockWorks: Work[] = [
	{ name: 'Obra 1', id: 1, address: 'Av. Siempre Viva', locality: 'Springfield' },
	{ name: 'Obra 2', id: 2, address: 'Calle 123', locality: 'CABA' },
];

const mockFolderWithWork: BudgetFolderVM = {
	id: 1,
	created_at: '2024-01-01',
	work_id: 1,
	client_id: 3,
	works: { address: 'Av. Siempre Viva', locality: 'Springfield', status: 'active' },
	budgets: [],
};

const mockFolderWithoutWork: BudgetFolderVM = {
	id: 2,
	created_at: '2024-01-02',
	work_id: null,
	client_id: 3,
	works: null,
	budgets: [],
};

describe('FolderCard', () => {
	const onToggle = jest.fn();
	const onChooseBudget = jest.fn();
	const onDeleteBudget = jest.fn();
	const onDeleteFolder = jest.fn();
	const onViewPdf = jest.fn();
	const onOpenDetail = jest.fn();
	const onAssignWork = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders folder with work label', () => {
		render(
			<FolderCard
				folder={mockFolderWithWork}
				works={mockWorks}
				isOpen={false}
				onToggle={onToggle}
				isLoading={false}
				onChooseBudget={onChooseBudget}
				onDeleteBudget={onDeleteBudget}
				onDeleteFolder={onDeleteFolder}
				onViewPdf={onViewPdf}
				onOpenDetail={onOpenDetail}
				onAssignWork={onAssignWork}
			/>
		);

		expect(screen.getByText('Av. Siempre Viva - Springfield')).toBeInTheDocument();
	});

	it('shows "Sin obra" when folder has no work', () => {
		render(
			<FolderCard
				folder={mockFolderWithoutWork}
				works={mockWorks}
				isOpen={false}
				onToggle={onToggle}
				isLoading={false}
				onChooseBudget={onChooseBudget}
				onDeleteBudget={onDeleteBudget}
				onDeleteFolder={onDeleteFolder}
				onViewPdf={onViewPdf}
				onOpenDetail={onOpenDetail}
				onAssignWork={onAssignWork}
			/>
		);

		expect(screen.getByText('Sin obra')).toBeInTheDocument();
	});

	it('shows "Asignar obra" button only when folder has no work', () => {
		const { rerender } = render(
			<FolderCard
				folder={mockFolderWithoutWork}
				works={mockWorks}
				isOpen={false}
				onToggle={onToggle}
				isLoading={false}
				onChooseBudget={onChooseBudget}
				onDeleteBudget={onDeleteBudget}
				onDeleteFolder={onDeleteFolder}
				onViewPdf={onViewPdf}
				onOpenDetail={onOpenDetail}
				onAssignWork={onAssignWork}
			/>
		);

		expect(screen.getByText('Asignar obra')).toBeInTheDocument();

		rerender(
			<FolderCard
				folder={mockFolderWithWork}
				works={mockWorks}
				isOpen={false}
				onToggle={onToggle}
				isLoading={false}
				onChooseBudget={onChooseBudget}
				onDeleteBudget={onDeleteBudget}
				onDeleteFolder={onDeleteFolder}
				onViewPdf={onViewPdf}
				onOpenDetail={onOpenDetail}
				onAssignWork={onAssignWork}
			/>
		);

		expect(screen.queryByText('Asignar obra')).not.toBeInTheDocument();
	});

	it('opens assign work modal when "Asignar obra" is clicked', () => {
		render(
			<FolderCard
				folder={mockFolderWithoutWork}
				works={mockWorks}
				isOpen={false}
				onToggle={onToggle}
				isLoading={false}
				onChooseBudget={onChooseBudget}
				onDeleteBudget={onDeleteBudget}
				onDeleteFolder={onDeleteFolder}
				onViewPdf={onViewPdf}
				onOpenDetail={onOpenDetail}
				onAssignWork={onAssignWork}
			/>
		);

		fireEvent.click(screen.getByText('Asignar obra'));

		expect(
			screen.getByText('Seleccioná la obra que querés asignar a esta carpeta de presupuestos.')
		).toBeInTheDocument();
		expect(screen.getByText('Asignar')).toBeInTheDocument();
		expect(screen.getByText('Cancelar')).toBeInTheDocument();
	});

	it('calls onAssignWork when a work is selected and confirmed', () => {
		render(
			<FolderCard
				folder={mockFolderWithoutWork}
				works={mockWorks}
				isOpen={false}
				onToggle={onToggle}
				isLoading={false}
				onChooseBudget={onChooseBudget}
				onDeleteBudget={onDeleteBudget}
				onDeleteFolder={onDeleteFolder}
				onViewPdf={onViewPdf}
				onOpenDetail={onOpenDetail}
				onAssignWork={onAssignWork}
			/>
		);

		fireEvent.click(screen.getByText('Asignar obra'));

		const selectTrigger = screen.getByRole('combobox');
		fireEvent.click(selectTrigger);

		const option = screen.getByText('Obra 1');
		fireEvent.click(option);

		fireEvent.click(screen.getByText('Asignar'));

		expect(onAssignWork).toHaveBeenCalledWith(2, 1);
	});

	it('shows budget count', () => {
		const folderWithBudgets = {
			...mockFolderWithWork,
			budgets: [
				{
					id: 1,
					type: 'MDF',
					amount_ars: 100,
					amount_usd: 0,
					created_at: '',
					folder_budget: { id: 1, work_id: 1, work: null },
				},
			] as any,
		};

		render(
			<FolderCard
				folder={folderWithBudgets}
				works={mockWorks}
				isOpen={false}
				onToggle={onToggle}
				isLoading={false}
				onChooseBudget={onChooseBudget}
				onDeleteBudget={onDeleteBudget}
				onDeleteFolder={onDeleteFolder}
				onViewPdf={onViewPdf}
				onOpenDetail={onOpenDetail}
				onAssignWork={onAssignWork}
			/>
		);

		expect(screen.getByText('1 presupuesto(s)')).toBeInTheDocument();
	});

	it('calls onDeleteFolder when delete button is clicked', () => {
		render(
			<FolderCard
				folder={mockFolderWithWork}
				works={mockWorks}
				isOpen={false}
				onToggle={onToggle}
				isLoading={false}
				onChooseBudget={onChooseBudget}
				onDeleteBudget={onDeleteBudget}
				onDeleteFolder={onDeleteFolder}
				onViewPdf={onViewPdf}
				onOpenDetail={onOpenDetail}
				onAssignWork={onAssignWork}
			/>
		);

		const deleteButton = screen
			.getAllByRole('button')
			.find((b) => b.querySelector('.lucide-trash-2'));
		expect(deleteButton).toBeDefined();
		fireEvent.click(deleteButton as HTMLElement);
		expect(onDeleteFolder).toHaveBeenCalledWith(1);
	});
});
