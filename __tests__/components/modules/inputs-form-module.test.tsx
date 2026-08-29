import React, { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { InputsFormModule, PendingFile } from '@/components/business/modules/inputs-form-module';

jest.mock('lucide-react', () => ({
	Camera: () => <span data-testid="lucide-camera" />,
	Video: () => <span data-testid="lucide-video" />,
	Square: () => <span data-testid="lucide-square" />,
	Image: () => <span data-testid="lucide-image" />,
	X: () => <span data-testid="lucide-x" />,
	Pencil: () => <span data-testid="lucide-pencil" />,
	Check: () => <span data-testid="lucide-check" />,
	ChevronsUpDown: () => <span data-testid="lucide-chevrons" />,
	Trash2: () => <span data-testid="lucide-trash" />,
}));

jest.mock('@/utils/file-upload-utils', () => ({
	formatFileSize: (n: number) => `${n} B`,
}));

jest.mock('@/components/ui/popover', () => {
	const React = require('react');
	const { createContext, useContext, useState } = React;
	const PopoverCtx = createContext<{ open: boolean; setOpen: (open: boolean) => void }>({
		open: false,
		setOpen: () => {},
	});
	const Popover = ({ open, onOpenChange, children }: any) => {
		const [internal] = useState(false);
		return (
			<PopoverCtx.Provider value={{ open: open ?? internal, setOpen: onOpenChange }}>
				<div data-testid="popover">{children}</div>
			</PopoverCtx.Provider>
		);
	};
	const PopoverTrigger = ({ children }: any) => {
		const { setOpen, open } = useContext(PopoverCtx);
		return (
			<div data-testid="popover-trigger" onClick={() => setOpen?.(!open)}>
				{children}
			</div>
		);
	};
	const PopoverContent = ({ children }: any) => {
		const { open } = useContext(PopoverCtx);
		return open ? <div data-testid="popover-content">{children}</div> : null;
	};
	return { Popover, PopoverTrigger, PopoverContent };
});

jest.mock('@/components/ui/command', () => ({
	Command: ({ children }: any) => <div data-testid="command">{children}</div>,
	CommandInput: (props: any) => <input data-testid="command-input" {...props} />,
	CommandItem: ({ children, onSelect, value }: any) => (
		<button type="button" data-testid={`command-item-${value}`} onClick={() => onSelect?.()}>
			{children}
		</button>
	),
	CommandList: ({ children }: any) => <div data-testid="command-list">{children}</div>,
	CommandEmpty: ({ children }: any) => <span data-testid="command-empty">{children}</span>,
}));

const workA = {
	id: 1,
	name: 'Obra Centro',
	locality: 'Centro',
	address: 'Av 1',
	hood: '',
	zone: '',
};
const workB = {
	id: 2,
	name: 'Obra Norte',
	locality: 'Norte',
	address: '',
	hood: '',
	zone: 'Zona 6',
};

const imgFile = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });

const baseProps = {
	title: '',
	description: '',
	works: [workA, workB] as any[],
	work: null as any,
	workPopoverOpen: false,
	files: [] as PendingFile[],
	isRecording: false,
	recordingTime: 0,
	recordingSize: 0,
	videoPreviewRef: createRef<HTMLVideoElement>(),
	fileInputRef: createRef<HTMLInputElement>(),
	onTitleChange: jest.fn(),
	onDescriptionChange: jest.fn(),
	onWorkPopoverOpenChange: jest.fn(),
	onWorkSelect: jest.fn(),
	onAddFiles: jest.fn(),
	onRemoveFile: jest.fn(),
	onUpdateFileField: jest.fn(),
	onRemoveAllFiles: jest.fn(),
	onTakePhoto: jest.fn(),
	onEditFile: jest.fn(),
	onToggleRecording: jest.fn(),
	formatTime: (s: number) => `${s}s`,
};

const renderForm = (overrides: any = {}) => {
	const fileInputRef = createRef<HTMLInputElement>();
	render(<InputsFormModule {...baseProps} fileInputRef={fileInputRef} {...overrides} />);
	return fileInputRef;
};

describe('InputsFormModule', () => {
	beforeEach(() => {
		baseProps.onTitleChange.mockClear();
		baseProps.onDescriptionChange.mockClear();
		baseProps.onWorkPopoverOpenChange.mockClear();
		baseProps.onWorkSelect.mockClear();
		baseProps.onAddFiles.mockClear();
		baseProps.onRemoveFile.mockClear();
		baseProps.onUpdateFileField.mockClear();
		baseProps.onRemoveAllFiles.mockClear();
		baseProps.onTakePhoto.mockClear();
		baseProps.onEditFile.mockClear();
		baseProps.onToggleRecording.mockClear();
	});

	it('renders title and description inputs', () => {
		render(<InputsFormModule {...baseProps} title="Mi módulo" description="Detalle" />);
		expect(screen.getByLabelText('Título')).toBeInTheDocument();
		expect(screen.getByLabelText('Descripción')).toBeInTheDocument();
	});

	it('handles title change', () => {
		render(<InputsFormModule {...baseProps} />);
		fireEvent.change(screen.getByPlaceholderText('Título del módulo'), {
			target: { value: 'Nuevo título' },
		});
		expect(baseProps.onTitleChange).toHaveBeenCalledWith('Nuevo título');
	});

	it('handles description change', () => {
		render(<InputsFormModule {...baseProps} />);
		fireEvent.change(screen.getByPlaceholderText('Descripción del módulo (opcional)'), {
			target: { value: 'Detalle' },
		});
		expect(baseProps.onDescriptionChange).toHaveBeenCalledWith('Detalle');
	});

	it('shows placeholder in the work trigger when no work is selected', () => {
		render(<InputsFormModule {...baseProps} />);
		expect(
			screen.getByText('Buscar obra por localidad, dirección, barrio o zona...')
		).toBeInTheDocument();
	});

	it('shows the selected work details on the trigger', () => {
		render(<InputsFormModule {...baseProps} work={workA as any} />);
		expect(screen.getByText('Centro - Av 1')).toBeInTheDocument();
	});

	it('fires onWorkPopoverOpenChange when toggling the work picker', () => {
		renderForm({});
		fireEvent.click(screen.getByRole('combobox'));
		expect(baseProps.onWorkPopoverOpenChange).toHaveBeenCalledWith(true);
	});

	it('renders works and selects one when opened', () => {
		render(<InputsFormModule {...baseProps} workPopoverOpen />);
		expect(screen.getByText('Centro - Av 1')).toBeInTheDocument();
		expect(screen.getByText('Norte - Zona 6')).toBeInTheDocument();
		fireEvent.click(screen.getByText('Centro - Av 1'));
		expect(baseProps.onWorkSelect).toHaveBeenCalledWith(workA);
	});

	it('shows empty state message when there are no works', () => {
		render(<InputsFormModule {...baseProps} workPopoverOpen works={[]} />);
		expect(screen.getByText('No se encontró ninguna obra')).toBeInTheDocument();
	});

	it('calls onTakePhoto from the Tomar foto button', () => {
		render(<InputsFormModule {...baseProps} />);
		fireEvent.click(screen.getByText('Tomar foto'));
		expect(baseProps.onTakePhoto).toHaveBeenCalled();
	});

	it('calls onToggleRecording from Grabar video', () => {
		render(<InputsFormModule {...baseProps} />);
		fireEvent.click(screen.getByText('Grabar video'));
		expect(baseProps.onToggleRecording).toHaveBeenCalledTimes(1);
	});

	it('disables Grabar video while recording', () => {
		render(<InputsFormModule {...baseProps} isRecording />);
		expect(screen.getByText('Grabar video')).toBeDisabled();
	});

	it('triggers the hidden file input from Cargar archivos', () => {
		const ref = renderForm({});
		const input = ref.current!;
		input.click = jest.fn();
		fireEvent.click(screen.getByText('Cargar archivos'));
		expect(input.click).toHaveBeenCalled();
	});

	it('passes selected files to onAddFiles and resets the input value', () => {
		render(<InputsFormModule {...baseProps} />);
		const input = document.querySelector('input[type="file"]')!;
		fireEvent.change(input, { target: { files: [imgFile] } });
		expect(baseProps.onAddFiles).toHaveBeenCalledWith([imgFile]);
		expect((input as HTMLInputElement).value).toBe('');
	});

	it('shows recording UI and stops via Detener', () => {
		render(<InputsFormModule {...baseProps} isRecording recordingTime={5} recordingSize={1024} />);
		expect(screen.getByText(/GRABANDO/)).toHaveTextContent('5s');
		expect(screen.getByText(/· 1024 B/)).toBeInTheDocument();
		fireEvent.click(screen.getByText('Detener'));
		expect(baseProps.onToggleRecording).toHaveBeenCalledTimes(1);
	});

	it('renders image files with thumbnail, metadata and buttons', () => {
		const files = [
			{
				id: 'f1',
				preview: 'blob:img',
				isImage: true,
				displayName: 'foto',
				description: 'foto desc',
				file: imgFile,
			},
		] as PendingFile[];
		render(<InputsFormModule {...baseProps} files={files} />);
		expect(screen.getByAltText('foto')).toBeInTheDocument();
		expect(screen.getByDisplayValue('foto')).toBeInTheDocument();
		expect(screen.getByDisplayValue('foto desc')).toBeInTheDocument();
		expect(screen.getByText('1 B')).toBeInTheDocument();

		fireEvent.click(screen.getByText('Editar'));
		expect(baseProps.onEditFile).toHaveBeenCalledWith('f1', imgFile);

		fireEvent.click(screen.getByTestId('lucide-x'));
		expect(baseProps.onRemoveFile).toHaveBeenCalledWith('f1');
	});

	it('shows the Editada badge when a file has been edited', () => {
		const files = [
			{
				id: 'f1',
				preview: 'blob:img',
				isImage: true,
				displayName: 'foto',
				description: '',
				file: imgFile,
				editedFile: imgFile,
			},
		] as PendingFile[];
		render(<InputsFormModule {...baseProps} files={files} />);
		expect(screen.getByText('Editada')).toBeInTheDocument();
	});

	it('renders video files with a placeholder instead of a thumbnail', () => {
		const files = [
			{
				id: 'v1',
				preview: '',
				isImage: false,
				displayName: 'clip.mp4',
				description: '',
				file: undefined,
			},
		] as PendingFile[];
		render(<InputsFormModule {...baseProps} files={files} />);
		expect(screen.getByText('clip.mp4')).toBeInTheDocument();
		expect(screen.queryByTestId('lucide-pencil')).not.toBeInTheDocument();
	});

	it('does not render file metadata or Quitar todos when there are no files', () => {
		render(<InputsFormModule {...baseProps} />);
		expect(screen.queryByText('Quitar todos')).not.toBeInTheDocument();
	});

	it('removes all files via Quitar todos', () => {
		const files = [
			{ id: 'f1', preview: '', isImage: true, displayName: 'a', description: '' },
		] as PendingFile[];
		render(<InputsFormModule {...baseProps} files={files} />);
		fireEvent.click(screen.getByText('Quitar todos'));
		expect(baseProps.onRemoveAllFiles).toHaveBeenCalled();
	});
});
