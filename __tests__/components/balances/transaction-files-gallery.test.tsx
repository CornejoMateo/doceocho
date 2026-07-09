import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransactionFilesGallery } from '@/components/business/balances/transactions/transaction-files-gallery';

jest.mock('@/components/ui/dialog', () => ({
	Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
	DialogContent: ({ children }: any) => <div>{children}</div>,
	DialogHeader: ({ children }: any) => <div>{children}</div>,
	DialogTitle: ({ children }: any) => <div>{children}</div>,
	DialogDescription: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/alert-dialog', () => ({
	AlertDialog: ({ children, open }: any) =>
		open ? <div data-testid="alert-dialog">{children}</div> : null,
	AlertDialogAction: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
	AlertDialogCancel: ({ children }: any) => <button>{children}</button>,
	AlertDialogContent: ({ children }: any) => <div>{children}</div>,
	AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
	AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, disabled, ...props }: any) => (
		<button onClick={onClick} disabled={disabled} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/file-viewer-modal', () => ({
	FileViewerModal: () => <div data-testid="file-viewer-modal" />,
}));

jest.mock('@/utils/file-upload-utils', () => ({
	getFileKind: (name: string) => (name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 'document'),
	formatFileSize: (size: number) => `${(size / 1024).toFixed(1)} KB`,
}));

const mockFiles = [
	{
		id: 1,
		url: 'https://example.com/img1.jpg',
		name: 'photo.jpg',
		displayName: 'Photo 1',
		size: 102400,
	},
	{
		id: 2,
		url: 'https://example.com/doc1.pdf',
		name: 'document.pdf',
		displayName: null,
		size: 204800,
	},
];

describe('TransactionFilesGallery', () => {
	const onUploadFiles = jest.fn();
	const onDeleteFile = jest.fn();
	const onClose = jest.fn();
	const formatCreatedAt = jest.fn((d) => d || 'sin fecha');

	const defaultProps = {
		open: true,
		transaction: { id: 1, date: '2024-06-15' } as any,
		files: mockFiles as any,
		isLoadingFiles: false,
		isUploadingFiles: false,
		onUploadFiles,
		onDeleteFile,
		onClose,
		formatCreatedAt,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders the dialog with title', () => {
		render(<TransactionFilesGallery {...defaultProps} />);

		expect(screen.getByText('Archivos de la transacción')).toBeInTheDocument();
	});

	it('shows loading state', () => {
		render(<TransactionFilesGallery {...defaultProps} isLoadingFiles={true} />);

		expect(screen.getByRole('button', { name: /subir archivos/i })).toBeInTheDocument();
	});

	it('shows empty state when no files', () => {
		render(<TransactionFilesGallery {...defaultProps} files={[]} />);

		expect(screen.getByText('No hay archivos adjuntos')).toBeInTheDocument();
	});

	it('renders file items', () => {
		render(<TransactionFilesGallery {...defaultProps} />);

		expect(screen.getByText('Photo 1')).toBeInTheDocument();
	});

	it('shows uploading state on upload button', () => {
		render(<TransactionFilesGallery {...defaultProps} isUploadingFiles={true} />);

		expect(screen.getByText('Subiendo...')).toBeInTheDocument();
	});

	it('calls onClose when dialog is closed', () => {
		render(<TransactionFilesGallery {...defaultProps} />);

		const dialog = screen.getByTestId('dialog');
		expect(dialog).toBeInTheDocument();
	});

	it('does not render when not open', () => {
		render(<TransactionFilesGallery {...defaultProps} open={false} />);

		expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
	});

	it('calls onDeleteFile when delete is confirmed', () => {
		render(<TransactionFilesGallery {...defaultProps} />);

		const allButtons = screen.getAllByRole('button');
		const uploadBtn = screen.getByText('Subir archivos');
		const trashButton =
			allButtons.find((btn) => btn.querySelector('svg') && !btn.contains(uploadBtn)) ||
			allButtons[allButtons.length - 1];
		fireEvent.click(trashButton);

		const confirmButton = screen.getByText('Eliminar');
		fireEvent.click(confirmButton);

		expect(onDeleteFile).toHaveBeenCalledWith(1);
	});
});
