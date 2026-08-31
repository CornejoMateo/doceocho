import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ModuleFormModal } from '@/components/business/modules/module-form-modal';
import { createModule, updateModule } from '@/lib/modules/modules';
import { listWorks } from '@/lib/works/works';
import { uploadModuleFile, deleteModuleFile, updateModuleFile } from '@/lib/modules/modules-files';
import { useModuleFiles } from '@/hooks/modules/use-module-files';
import { useAuth } from '@/components/provider/auth-provider';
import { toast } from '@/components/ui/use-toast';

jest.mock('@/lib/modules/modules', () => ({
	createModule: jest.fn(),
	updateModule: jest.fn(),
}));

jest.mock('@/lib/works/works', () => ({
	listWorks: jest.fn(),
}));

jest.mock('@/lib/modules/modules-files', () => ({
	uploadModuleFile: jest.fn(),
	deleteModuleFile: jest.fn(),
	updateModuleFile: jest.fn(),
}));

jest.mock('@/components/provider/auth-provider', () => ({
	useAuth: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => e?.message || 'Error desconocido',
}));

jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(),
}));

jest.mock('lucide-react', () => ({
	Loader2: () => <span data-testid="lucide-loader" />,
	Check: () => <span data-testid="lucide-check" />,
	AlertCircle: () => <span data-testid="lucide-alert-circle" />,
}));

jest.mock('@/components/ui/dialog', () => ({
	Dialog: ({ open, children }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
	DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
	DialogHeader: ({ children }: any) => <div>{children}</div>,
	DialogTitle: ({ children }: any) => <h2>{children}</h2>,
	DialogDescription: ({ children }: any) => <p>{children}</p>,
	DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
}));

const mockHookFiles: any[] = [];
const mockOriginalIds: number[] = [];
const mockOpenEditorForNew = jest.fn();

jest.mock('@/components/business/modules/inputs-form-module', () => ({
	InputsFormModule: ({
		title,
		description,
		onTitleChange,
		onDescriptionChange,
		onWorkSelect,
		onTakePhoto,
	}: any) => (
		<div data-testid="inputs-form-module">
			<input data-testid="fm-title" value={title} onChange={(e) => onTitleChange(e.target.value)} />
			<input
				data-testid="fm-desc"
				value={description}
				onChange={(e) => onDescriptionChange(e.target.value)}
			/>
			<button
				type="button"
				data-testid="fm-work"
				onClick={() => onWorkSelect({ id: 5, name: 'Obra Centro', locality: 'Centro' })}
			>
				select-work
			</button>
			<button type="button" data-testid="fm-photo" onClick={onTakePhoto}>
				take-photo
			</button>
		</div>
	),
}));

jest.mock('@/components/ui/image-editor-dialog', () => ({
	ImageEditorDialog: ({ open }: any) => (open ? <div data-testid="image-editor-dialog" /> : null),
}));

jest.mock('@/hooks/modules/use-module-files', () => ({
	useModuleFiles: jest.fn(() => ({
		files: mockHookFiles,
		addFiles: jest.fn(),
		removeFile: jest.fn(),
		updateFileField: jest.fn(),
		removeAllFiles: jest.fn(),
		isRecording: false,
		recordingTime: 0,
		recordingSize: 0,
		stopRecording: jest.fn(),
		toggleRecording: jest.fn(),
		videoPreviewRef: { current: null },
		fileInputRef: { current: null },
		editorOpen: false,
		fileForEditor: null,
		openEditorForNew: mockOpenEditorForNew,
		openEditorForEdit: jest.fn(),
		closeEditor: jest.fn(),
		handleImageReady: jest.fn(),
		getOriginalExistingIds: () => mockOriginalIds,
		errorFiles: null,
	})),
}));

const mockUseAuth = useAuth as jest.Mock;

const imageBlob = new Blob(['x'], { type: 'image/jpeg' });
const imageFile = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });

const renderForm = (props: any = {}) =>
	render(
		<ModuleFormModal
			open
			onOpenChange={jest.fn()}
			onCreated={jest.fn()}
			moduleToEdit={null}
			{...props}
		/>
	);

describe('ModuleFormModal', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		URL.createObjectURL = jest.fn(() => 'blob:mock') as any;
		URL.revokeObjectURL = jest.fn() as any;

		mockHookFiles.length = 0;
		mockOriginalIds.length = 0;
		(useModuleFiles as jest.Mock).mockImplementation(() => ({
			files: mockHookFiles,
			addFiles: jest.fn(),
			removeFile: jest.fn(),
			updateFileField: jest.fn(),
			removeAllFiles: jest.fn(),
			isRecording: false,
			recordingTime: 0,
			recordingSize: 0,
			stopRecording: jest.fn(),
			toggleRecording: jest.fn(),
			videoPreviewRef: { current: null },
			fileInputRef: { current: null },
			editorOpen: false,
			fileForEditor: null,
			openEditorForNew: mockOpenEditorForNew,
			openEditorForEdit: jest.fn(),
			closeEditor: jest.fn(),
			handleImageReady: jest.fn(),
			getOriginalExistingIds: () => mockOriginalIds,
			errorFiles: null,
		}));

		mockUseAuth.mockReturnValue({
			user: { uid: 'user-1' },
			loading: false,
			signIn: jest.fn(),
			signOutUser: jest.fn(),
		});
		(listWorks as jest.Mock).mockResolvedValue({
			data: [{ id: 5, name: 'Obra Centro' }],
			error: null,
		});
		(createModule as jest.Mock).mockResolvedValue({ data: { id: 9 }, error: null });
		(updateModule as jest.Mock).mockResolvedValue({
			data: { id: 3, title: 'Fundaciones', work_id: 5 },
			error: null,
		});
		(uploadModuleFile as jest.Mock).mockResolvedValue({ error: null });
		(deleteModuleFile as jest.Mock).mockResolvedValue({ success: true, error: null });
		(updateModuleFile as jest.Mock).mockResolvedValue({ error: null });
	});

	it('loads works when opened', async () => {
		renderForm();
		await waitFor(() => {
			expect(listWorks).toHaveBeenCalled();
		});
	});

	it('shows an error alert when works fail to load', async () => {
		(listWorks as jest.Mock).mockResolvedValue({ data: null, error: { message: 'DB error' } });
		renderForm();
		await waitFor(() => {
			expect(screen.getByText('Error cargando obras: DB error')).toBeInTheDocument();
		});
	});

	it('renders in edit mode with module data prefilled', async () => {
		renderForm({
			moduleToEdit: {
				id: 3,
				title: 'Fundaciones',
				description: 'detalle',
				work_id: 5,
				works: { name: 'Obra Centro' },
			},
		});
		expect(screen.getByText('Editar módulo')).toBeInTheDocument();
		await waitFor(() => {
			expect(screen.getByTestId('fm-title')).toHaveValue('Fundaciones');
		});
		expect(screen.getByTestId('fm-desc')).toHaveValue('detalle');
	});

	it('shows a destructive toast when there is no user', async () => {
		mockUseAuth.mockReturnValue({ user: null });
		renderForm();
		fireEvent.change(screen.getByTestId('fm-title'), { target: { value: 'X' } });
		fireEvent.click(screen.getByTestId('fm-work'));
		fireEvent.click(screen.getByText('Crear módulo'));
		await waitFor(() => {
			expect(toast).toHaveBeenCalledWith(
				expect.objectContaining({
					variant: 'destructive',
					title: 'No autenticado',
				})
			);
		});
		expect(createModule).not.toHaveBeenCalled();
	});

	it('requires a title', () => {
		renderForm();
		fireEvent.click(screen.getByTestId('fm-work'));
		fireEvent.click(screen.getByText('Crear módulo'));
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({
				variant: 'destructive',
				title: 'Falta el título',
			})
		);
		expect(createModule).not.toHaveBeenCalled();
	});

	it('requires a work selection', () => {
		renderForm();
		fireEvent.change(screen.getByTestId('fm-title'), { target: { value: 'Módulo' } });
		fireEvent.click(screen.getByText('Crear módulo'));
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({
				variant: 'destructive',
				title: 'Falta la obra',
			})
		);
		expect(createModule).not.toHaveBeenCalled();
	});

	it('creates a module successfully and uploads its files', async () => {
		mockHookFiles.push({
			id: 'f1',
			displayName: 'foto',
			description: '',
			file: imageFile,
			isImage: true,
		});
		const onCreated = jest.fn();
		const onOpenChange = jest.fn();
		renderForm({ onCreated, onOpenChange });

		fireEvent.change(screen.getByTestId('fm-title'), { target: { value: 'Nuevo módulo' } });
		fireEvent.click(screen.getByTestId('fm-work'));
		fireEvent.click(screen.getByText('Crear módulo'));

		await waitFor(() => {
			expect(createModule).toHaveBeenCalledWith({
				title: 'Nuevo módulo',
				description: null,
				work_id: 5,
				user_id: 'user-1',
				status: 'not_send',
			});
		});
		expect(uploadModuleFile).toHaveBeenCalledWith(9, imageFile, null, 'foto');
		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Módulo creado' }));
		expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 9 }));
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
	});

	it('toasts about partial file upload errors after creating', async () => {
		mockHookFiles.push({
			id: 'f1',
			displayName: 'foto',
			description: '',
			file: imageFile,
			isImage: true,
		});
		(uploadModuleFile as jest.Mock).mockResolvedValue({ error: { message: 'up err' } });
		renderForm();

		fireEvent.change(screen.getByTestId('fm-title'), { target: { value: 'Módulo' } });
		fireEvent.click(screen.getByTestId('fm-work'));
		fireEvent.click(screen.getByText('Crear módulo'));

		await waitFor(() => {
			expect(toast).toHaveBeenCalledWith(
				expect.objectContaining({
					variant: 'destructive',
					title: 'Módulo creado, pero hubo errores al subir archivos',
				})
			);
		});
	});

	it('updates an existing module and cleans up removed files', async () => {
		mockOriginalIds.push(1, 2);
		mockHookFiles.push({
			id: 'e2',
			existingId: 2,
			displayName: 'f2',
			description: '',
			file: undefined,
			isImage: false,
		});
		renderForm({
			moduleToEdit: {
				id: 3,
				title: 'Fundaciones',
				description: 'detalle',
				work_id: 5,
				works: { name: 'Obra Centro' },
			},
		});

		await waitFor(() => {
			expect(screen.getByTestId('fm-title')).toHaveValue('Fundaciones');
		});
		fireEvent.click(screen.getByTestId('fm-work'));
		fireEvent.click(screen.getByText('Guardar cambios'));

		await waitFor(() => {
			expect(updateModule).toHaveBeenCalledWith(3, {
				title: 'Fundaciones',
				description: 'detalle',
				work_id: 5,
			});
			expect(deleteModuleFile).toHaveBeenCalledWith(1);
			expect(updateModuleFile).toHaveBeenCalledWith(2, {
				file_name: 'f2',
				description: null,
			});
		});
		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Módulo actualizado' }));
	});

	it('shows a destructive toast when creation fails', async () => {
		(createModule as jest.Mock).mockResolvedValue({ data: null, error: { message: 'boom' } });
		renderForm();

		fireEvent.change(screen.getByTestId('fm-title'), { target: { value: 'Módulo' } });
		fireEvent.click(screen.getByTestId('fm-work'));
		fireEvent.click(screen.getByText('Crear módulo'));

		await waitFor(() => {
			expect(toast).toHaveBeenCalledWith(
				expect.objectContaining({
					variant: 'destructive',
					title: 'Error al crear el módulo',
					description: 'boom',
				})
			);
		});
	});

	it('disables the submit button and shows Guardando while submitting', async () => {
		let resolveCreate: (value: any) => void = () => {};
		(createModule as jest.Mock).mockImplementation(
			() => new Promise((resolve) => (resolveCreate = resolve))
		);
		renderForm();

		fireEvent.change(screen.getByTestId('fm-title'), { target: { value: 'Módulo' } });
		fireEvent.click(screen.getByTestId('fm-work'));
		fireEvent.click(screen.getByText('Crear módulo'));

		expect(screen.getByText('Guardando...')).toBeInTheDocument();
		expect(screen.getByText('Guardando...').closest('button')).toBeDisabled();

		await act(async () => {
			resolveCreate({ data: { id: 9 }, error: null });
		});
		await waitFor(() => {
			expect(screen.queryByText('Guardando...')).not.toBeInTheDocument();
		});
	});

	it('fires openEditorForNew from the take-photo action', () => {
		renderForm();
		fireEvent.click(screen.getByTestId('fm-photo'));
		expect(mockOpenEditorForNew).toHaveBeenCalled();
	});

	it('closes the dialog via Cancelar', () => {
		const onOpenChange = jest.fn();
		renderForm({ onOpenChange });
		fireEvent.click(screen.getByText('Cancelar'));
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
	});
});
