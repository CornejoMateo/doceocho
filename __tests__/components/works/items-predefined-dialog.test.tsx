import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ItemsPredefinedDialog } from '@/components/business/works/checklists/items-predefined-dialog';
import { deleteMaterial } from '@/lib/checklists/materials';
import { toast } from '@/components/ui/use-toast';

jest.mock('@/components/ui/dialog', () => ({
	Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
	DialogContent: ({ children }: any) => <div>{children}</div>,
	DialogHeader: ({ children }: any) => <div>{children}</div>,
	DialogTitle: ({ children }: any) => <h2>{children}</h2>,
	DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

jest.mock('@/components/ui/alert-dialog', () => {
	let alertOnOpenChange: any;
	return {
		AlertDialog: ({ children, open, onOpenChange: ooc }: any) => {
			alertOnOpenChange = ooc;
			return open ? <div>{children}</div> : null;
		},
		AlertDialogContent: ({ children }: any) => <div>{children}</div>,
		AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
		AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
		AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
		AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
		AlertDialogCancel: (props: any) => (
			<button {...props} onClick={() => alertOnOpenChange?.(false)} />
		),
		AlertDialogAction: ({ onClick, ...props }: any) => <button onClick={onClick} {...props} />,
	};
});

jest.mock('@/components/ui/tabs', () => ({
	Tabs: ({ children }: any) => <div>{children}</div>,
	TabsList: ({ children }: any) => <div>{children}</div>,
	TabsTrigger: ({ children }: any) => <button>{children}</button>,
	TabsContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => `translated: ${e?.message || e}`,
}));

jest.mock('@/lib/checklists/materials', () => ({
	deleteMaterial: jest.fn(),
}));

jest.mock('@/components/business/works/checklists/items-predefined-materials-tab', () => ({
	MaterialsTab: ({ materials, onRefreshMaterials, onDeleteRequest }: any) => (
		<div data-testid="materials-tab">
			<span>Materials: {materials.length}</span>
			<button onClick={() => onDeleteRequest(1)}>Delete material 1</button>
			<button onClick={() => onRefreshMaterials()}>Refresh materials</button>
		</div>
	),
}));

jest.mock('@/components/business/works/checklists/items-predefined-items-tab', () => ({
	ItemsTab: ({ materials, itemsPredefined, onRefreshItemsPredefined }: any) => (
		<div data-testid="items-tab">
			<span>Materials: {materials.length}</span>
			<span>ItemsPredefined: {itemsPredefined.length}</span>
			<button onClick={() => onRefreshItemsPredefined()}>Refresh items</button>
		</div>
	),
}));

describe('ItemsPredefinedDialog', () => {
	const onOpenChange = jest.fn();
	const refreshMaterials = jest.fn().mockResolvedValue(undefined);
	const refreshItemsPredefined = jest.fn().mockResolvedValue(undefined);
	const materials = [
		{ id: 1, name: 'MDF' },
		{ id: 2, name: 'Aglomerado' },
	];
	const itemsPredefined = [{ id: 1, material_id: 1, items: ['Item A', 'Item B'] }];

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders nothing when closed', () => {
		const { container } = render(
			<ItemsPredefinedDialog
				open={false}
				onOpenChange={onOpenChange}
				materials={materials}
				itemsPredefined={itemsPredefined}
				refreshMaterials={refreshMaterials}
				refreshItemsPredefined={refreshItemsPredefined}
			/>
		);

		expect(container.textContent).toBe('');
	});

	it('shows loading state', () => {
		render(
			<ItemsPredefinedDialog
				open={true}
				onOpenChange={onOpenChange}
				materials={materials}
				itemsPredefined={itemsPredefined}
				refreshMaterials={refreshMaterials}
				refreshItemsPredefined={refreshItemsPredefined}
				isLoading={true}
			/>
		);

		expect(screen.getByText('Cargando...')).toBeInTheDocument();
		expect(screen.queryByTestId('materials-tab')).not.toBeInTheDocument();
		expect(screen.queryByTestId('items-tab')).not.toBeInTheDocument();
	});

	it('renders title and description when open', () => {
		render(
			<ItemsPredefinedDialog
				open={true}
				onOpenChange={onOpenChange}
				materials={materials}
				itemsPredefined={itemsPredefined}
				refreshMaterials={refreshMaterials}
				refreshItemsPredefined={refreshItemsPredefined}
			/>
		);

		expect(screen.getByText('Configuración de materiales')).toBeInTheDocument();
		expect(
			screen.getByText(
				'Gestiona los materiales y sus items predefinidos que se cargan automáticamente al crear una checklist.'
			)
		).toBeInTheDocument();
	});

	it('renders tab triggers', () => {
		render(
			<ItemsPredefinedDialog
				open={true}
				onOpenChange={onOpenChange}
				materials={materials}
				itemsPredefined={itemsPredefined}
				refreshMaterials={refreshMaterials}
				refreshItemsPredefined={refreshItemsPredefined}
			/>
		);

		expect(screen.getByText('Materiales')).toBeInTheDocument();
		expect(screen.getByText('Items predefinidos')).toBeInTheDocument();
	});

	it('renders MaterialsTab and ItemsTab with correct props', () => {
		render(
			<ItemsPredefinedDialog
				open={true}
				onOpenChange={onOpenChange}
				materials={materials}
				itemsPredefined={itemsPredefined}
				refreshMaterials={refreshMaterials}
				refreshItemsPredefined={refreshItemsPredefined}
			/>
		);

		expect(screen.getByTestId('materials-tab')).toBeInTheDocument();
		expect(screen.getByTestId('items-tab')).toBeInTheDocument();

		const materialsTab = screen.getByTestId('materials-tab');
		expect(materialsTab).toHaveTextContent('Materials: 2');

		const itemsTab = screen.getByTestId('items-tab');
		expect(itemsTab).toHaveTextContent('ItemsPredefined: 1');
	});

	it('shows delete confirmation AlertDialog on delete request', () => {
		render(
			<ItemsPredefinedDialog
				open={true}
				onOpenChange={onOpenChange}
				materials={materials}
				itemsPredefined={itemsPredefined}
				refreshMaterials={refreshMaterials}
				refreshItemsPredefined={refreshItemsPredefined}
			/>
		);

		fireEvent.click(screen.getByText('Delete material 1'));

		expect(screen.getByText('Eliminar material')).toBeInTheDocument();
		expect(
			screen.getByText(/¿Estás seguro de que deseas eliminar el material/)
		).toBeInTheDocument();
		expect(screen.getByText(/MDF/)).toBeInTheDocument();
	});

	it('closes delete confirmation on cancel', () => {
		render(
			<ItemsPredefinedDialog
				open={true}
				onOpenChange={onOpenChange}
				materials={materials}
				itemsPredefined={itemsPredefined}
				refreshMaterials={refreshMaterials}
				refreshItemsPredefined={refreshItemsPredefined}
			/>
		);

		fireEvent.click(screen.getByText('Delete material 1'));
		expect(screen.getByText('Eliminar material')).toBeInTheDocument();

		fireEvent.click(screen.getByText('Cancelar'));
		expect(screen.queryByText('Eliminar material')).not.toBeInTheDocument();
	});

	it('calls deleteMaterial and refreshes on confirm', async () => {
		(deleteMaterial as jest.Mock).mockResolvedValue({ error: null });

		render(
			<ItemsPredefinedDialog
				open={true}
				onOpenChange={onOpenChange}
				materials={materials}
				itemsPredefined={itemsPredefined}
				refreshMaterials={refreshMaterials}
				refreshItemsPredefined={refreshItemsPredefined}
			/>
		);

		fireEvent.click(screen.getByText('Delete material 1'));
		fireEvent.click(screen.getByText('Eliminar'));

		await waitFor(() => {
			expect(deleteMaterial).toHaveBeenCalledWith(1);
		});

		expect(refreshMaterials).toHaveBeenCalled();
		expect(refreshItemsPredefined).toHaveBeenCalled();
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Material eliminado',
			})
		);
	});

	it('shows error toast when deleteMaterial fails', async () => {
		(deleteMaterial as jest.Mock).mockResolvedValue({
			data: null,
			error: new Error('No permission'),
		});

		render(
			<ItemsPredefinedDialog
				open={true}
				onOpenChange={onOpenChange}
				materials={materials}
				itemsPredefined={itemsPredefined}
				refreshMaterials={refreshMaterials}
				refreshItemsPredefined={refreshItemsPredefined}
			/>
		);

		fireEvent.click(screen.getByText('Delete material 1'));
		fireEvent.click(screen.getByText('Eliminar'));

		await waitFor(() => {
			expect(deleteMaterial).toHaveBeenCalledWith(1);
		});

		expect(refreshMaterials).not.toHaveBeenCalled();
		expect(refreshItemsPredefined).not.toHaveBeenCalled();
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Error',
				variant: 'destructive',
			})
		);
	});

	it('shows error toast when deleteMaterial throws', async () => {
		(deleteMaterial as jest.Mock).mockRejectedValue(new Error('Network error'));

		render(
			<ItemsPredefinedDialog
				open={true}
				onOpenChange={onOpenChange}
				materials={materials}
				itemsPredefined={itemsPredefined}
				refreshMaterials={refreshMaterials}
				refreshItemsPredefined={refreshItemsPredefined}
			/>
		);

		fireEvent.click(screen.getByText('Delete material 1'));
		fireEvent.click(screen.getByText('Eliminar'));

		await waitFor(() => {
			expect(deleteMaterial).toHaveBeenCalledWith(1);
		});

		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Error',
				variant: 'destructive',
			})
		);
	});

	it('disables buttons while deleting', async () => {
		(deleteMaterial as jest.Mock).mockImplementation(
			() => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100))
		);

		render(
			<ItemsPredefinedDialog
				open={true}
				onOpenChange={onOpenChange}
				materials={materials}
				itemsPredefined={itemsPredefined}
				refreshMaterials={refreshMaterials}
				refreshItemsPredefined={refreshItemsPredefined}
			/>
		);

		fireEvent.click(screen.getByText('Delete material 1'));

		const eliminarButton = screen.getByText('Eliminar');
		fireEvent.click(eliminarButton);

		expect(screen.getByText('Cancelar')).toBeDisabled();
		expect(screen.getByText('Eliminar')).toBeDisabled();
	});

	it('clears deleteId immediately after successful delete even if refresh fails', async () => {
		(deleteMaterial as jest.Mock).mockResolvedValue({ error: null });
		refreshMaterials.mockRejectedValue(new Error('Refresh failed'));

		render(
			<ItemsPredefinedDialog
				open={true}
				onOpenChange={onOpenChange}
				materials={materials}
				itemsPredefined={itemsPredefined}
				refreshMaterials={refreshMaterials}
				refreshItemsPredefined={refreshItemsPredefined}
			/>
		);

		fireEvent.click(screen.getByText('Delete material 1'));
		expect(screen.getByText('Eliminar material')).toBeInTheDocument();

		fireEvent.click(screen.getByText('Eliminar'));

		await waitFor(() => {
			expect(deleteMaterial).toHaveBeenCalledWith(1);
		});

		expect(screen.queryByText('Eliminar material')).not.toBeInTheDocument();
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Material eliminado',
			})
		);
	});
});
