import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChecklistModal } from '@/components/business/works/checklists/checklist-modal';
import { listMaterials } from '@/lib/checklists/materials';
import { getItemsPredefinedByMaterialId } from '@/lib/checklists/items-predefined';
import { getItemsByChecklistId } from '@/lib/checklists/checklists';
import { toast } from '@/components/ui/use-toast';

jest.mock('@/components/ui/dialog', () => ({
	Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
	DialogContent: ({ children }: any) => <div>{children}</div>,
	DialogHeader: ({ children }: any) => <div>{children}</div>,
	DialogTitle: ({ children }: any) => <h2>{children}</h2>,
	DialogDescription: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/select', () => {
	let selectOnValueChange: any;
	return {
		Select: ({ children, onValueChange }: any) => {
			selectOnValueChange = onValueChange;
			return <div data-testid="select">{children}</div>;
		},
		SelectTrigger: ({ children }: any) => <div>{children}</div>,
		SelectValue: ({ children, placeholder }: any) => (
			<span data-testid="select-value">{children || placeholder}</span>
		),
		SelectContent: ({ children }: any) => <div>{children}</div>,
		SelectItem: ({ children, value, disabled }: any) => (
			<button
				data-testid={`select-item-${value}`}
				disabled={disabled}
				onClick={() => selectOnValueChange?.(value)}
			>
				{children}
			</button>
		),
	};
});

jest.mock('@/components/ui/card', () => ({
	Card: ({ children }: any) => <div>{children}</div>,
	CardContent: ({ children }: any) => <div>{children}</div>,
	CardHeader: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/input', () => ({
	Input: (props: any) => <input {...props} />,
}));

jest.mock('@/components/ui/label', () => ({
	Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, disabled, ...props }: any) => (
		<button onClick={onClick} disabled={disabled} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/badge', () => ({
	Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => `translated: ${e?.message || e}`,
}));

jest.mock('@/lib/checklists/materials', () => ({
	listMaterials: jest.fn(),
}));

jest.mock('@/lib/checklists/items-predefined', () => ({
	getItemsPredefinedByMaterialId: jest.fn(),
}));

jest.mock('@/lib/checklists/checklists', () => ({
	getItemsByChecklistId: jest.fn(),
}));

jest.mock('@/hooks/clients/use-checklist-modal', () => ({
	useChecklistModal: jest.fn(),
}));

describe('ChecklistModal', () => {
	const onSave = jest.fn();
	const onOpenChange = jest.fn();

	let hookChecklist: any;
	let hookUpdateField: jest.Mock;
	let hookAddItem: jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();

		hookChecklist = {
			name: null,
			description: null,
			items: [] as { description: string }[],
			width: null,
			height: null,
			depth: null,
			type_furniture: null,
		};

		hookUpdateField = jest.fn((field: string, value: any) => {
			hookChecklist[field] = value === '' ? null : value;
		});

		hookAddItem = jest.fn();

		const useChecklistModal = require('@/hooks/clients/use-checklist-modal').useChecklistModal;
		useChecklistModal.mockImplementation(() => ({
			checklist: hookChecklist,
			resetForm: jest.fn(),
			updateField: hookUpdateField,
			addItem: hookAddItem,
			removeItem: jest.fn(),
			updateItem: jest.fn(),
			setItems: jest.fn(),
			initializeChecklist: jest.fn(),
		}));

		(listMaterials as jest.Mock).mockResolvedValue({
			data: [
				{ id: 1, name: 'MDF' },
				{ id: 2, name: 'Aglomerado' },
			],
			error: null,
		});

		(getItemsPredefinedByMaterialId as jest.Mock).mockResolvedValue({
			data: { material_id: 1, items: ['Item A', 'Item B'] },
			error: null,
		});

		(getItemsByChecklistId as jest.Mock).mockResolvedValue({
			data: null,
			error: null,
		});
	});

	it('renders nothing when closed', () => {
		const { container } = render(
			<ChecklistModal workId={1} onSave={onSave} open={false} onOpenChange={onOpenChange} />
		);

		expect(container.textContent).toBe('');
	});

	it('renders create mode title when open', () => {
		render(<ChecklistModal workId={1} onSave={onSave} open={true} onOpenChange={onOpenChange} />);

		expect(screen.getByText('Crear Checklist')).toBeInTheDocument();
	});

	it('renders edit mode title when editing', () => {
		render(
			<ChecklistModal
				workId={1}
				onSave={onSave}
				open={true}
				onOpenChange={onOpenChange}
				checklistToEdit={{ id: 5, name: 'Test', work_id: 1 } as any}
			/>
		);

		expect(screen.getByText('Editar Checklist')).toBeInTheDocument();
	});

	it('loads materials on open', async () => {
		render(<ChecklistModal workId={1} onSave={onSave} open={true} onOpenChange={onOpenChange} />);

		await waitFor(() => {
			expect(listMaterials).toHaveBeenCalled();
		});
	});

	it('shows loading state when fetching predefined items', async () => {
		(getItemsPredefinedByMaterialId as jest.Mock).mockImplementation(
			() => new Promise((resolve) => setTimeout(() => resolve({ data: null, error: null }), 200))
		);

		const { rerender } = render(
			<ChecklistModal workId={1} onSave={onSave} open={true} onOpenChange={onOpenChange} />
		);

		await waitFor(() => {
			expect(screen.getByTestId('select-item-MDF')).toBeInTheDocument();
		});

		hookChecklist.type_furniture = 'MDF';

		const useChecklistModal = require('@/hooks/clients/use-checklist-modal').useChecklistModal;
		useChecklistModal.mockImplementation(() => ({
			checklist: { ...hookChecklist },
			resetForm: jest.fn(),
			updateField: hookUpdateField,
			addItem: hookAddItem,
			removeItem: jest.fn(),
			updateItem: jest.fn(),
			setItems: jest.fn(),
			initializeChecklist: jest.fn(),
		}));

		rerender(<ChecklistModal workId={1} onSave={onSave} open={true} onOpenChange={onOpenChange} />);

		expect(screen.getByText('Cargando items...')).toBeInTheDocument();
	});

	it('displays created count badge after saving', async () => {
		onSave.mockResolvedValue(undefined);

		render(<ChecklistModal workId={1} onSave={onSave} open={true} onOpenChange={onOpenChange} />);

		expect(screen.queryByText(/creada/)).not.toBeInTheDocument();

		fireEvent.click(screen.getByText('Crear y siguiente'));

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledTimes(1);
		});

		expect(screen.getByText(/1 creada/)).toBeInTheDocument();
	});

	it('calls onSave with checklist data', async () => {
		onSave.mockResolvedValue(undefined);

		render(<ChecklistModal workId={1} onSave={onSave} open={true} onOpenChange={onOpenChange} />);

		fireEvent.click(screen.getByText('Crear y siguiente'));

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith(expect.objectContaining(hookChecklist));
		});
	});

	it('shows toast and resets form on successful save', async () => {
		onSave.mockResolvedValue(undefined);

		const useChecklistModal = require('@/hooks/clients/use-checklist-modal').useChecklistModal;
		const resetForm = jest.fn();
		useChecklistModal.mockImplementation(() => ({
			checklist: hookChecklist,
			resetForm,
			updateField: hookUpdateField,
			addItem: hookAddItem,
			removeItem: jest.fn(),
			updateItem: jest.fn(),
			setItems: jest.fn(),
			initializeChecklist: jest.fn(),
		}));

		render(<ChecklistModal workId={1} onSave={onSave} open={true} onOpenChange={onOpenChange} />);

		fireEvent.click(screen.getByText('Crear y siguiente'));

		await waitFor(() => {
			expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Checklist creada' }));
		});

		expect(resetForm).toHaveBeenCalled();
	});

	it('shows error toast when save fails', async () => {
		onSave.mockRejectedValue(new Error('DB error'));

		render(<ChecklistModal workId={1} onSave={onSave} open={true} onOpenChange={onOpenChange} />);

		fireEvent.click(screen.getByText('Crear y siguiente'));

		await waitFor(() => {
			expect(toast).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Error', variant: 'destructive' })
			);
		});
	});

	it('displays error message on failure', async () => {
		onSave.mockRejectedValue(new Error('DB error'));

		render(<ChecklistModal workId={1} onSave={onSave} open={true} onOpenChange={onOpenChange} />);

		fireEvent.click(screen.getByText('Crear y siguiente'));

		await waitFor(() => {
			expect(screen.getByText('translated: DB error')).toBeInTheDocument();
		});
	});

	it('calls onUpdate in edit mode', async () => {
		const onUpdate = jest.fn();
		const useChecklistModal = require('@/hooks/clients/use-checklist-modal').useChecklistModal;
		useChecklistModal.mockImplementation(() => ({
			checklist: hookChecklist,
			resetForm: jest.fn(),
			updateField: hookUpdateField,
			addItem: hookAddItem,
			removeItem: jest.fn(),
			updateItem: jest.fn(),
			setItems: jest.fn(),
			initializeChecklist: jest.fn(),
		}));

		render(
			<ChecklistModal
				workId={1}
				onSave={onSave}
				onUpdate={onUpdate}
				open={true}
				onOpenChange={onOpenChange}
				checklistToEdit={{ id: 5, name: 'Test', work_id: 1 } as any}
			/>
		);

		fireEvent.click(screen.getByText('Guardar Cambios'));

		await waitFor(() => {
			expect(onUpdate).toHaveBeenCalledWith(5, expect.objectContaining({ items: [] }));
		});

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('closes modal on finish', () => {
		render(<ChecklistModal workId={1} onSave={onSave} open={true} onOpenChange={onOpenChange} />);

		fireEvent.click(screen.getByText('Finalizar'));

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});
