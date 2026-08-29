import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModuleDetailsModal } from '@/components/business/modules/module-details-modal';
import { listModuleFiles } from '@/lib/modules/modules-files';
import { getSupabaseClient } from '@/lib/supabase-client';
import { toast } from '@/components/ui/use-toast';

jest.mock('@/lib/modules/modules-files', () => ({
	listModuleFiles: jest.fn(),
}));

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => e?.message || 'Error desconocido',
}));

jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(),
}));

jest.mock('@/utils/file-upload-utils', () => ({
	formatDate: () => '28/08/2026',
	getFileKind: (name: string) =>
		/(\.jpe?g|\.png|\.webp|\.gif|\.heic)$/i.test(name)
			? 'image'
			: /\.(mp4|webm|mov)$/i.test(name)
				? 'video'
				: 'file',
	isImage: (t: string) => t.startsWith('image/'),
	isVideo: (t: string) => t.startsWith('video/'),
}));

jest.mock('@/helpers/modules/modules-helper', () => ({
	ModuleStatusBadge: ({ status }: any) => (
		<span data-testid="status-badge">{status ?? 'not_send'}</span>
	),
	getModuleWorkLabel: (m: any) => m?.works?.name || m?.work_name || 'Sin obra',
}));

jest.mock('lucide-react', () => ({
	AlertCircle: () => <span data-testid="lucide-alert-circle" />,
	Download: () => <span data-testid="lucide-download" />,
	Loader2: () => <span data-testid="lucide-loader" />,
	Pencil: () => <span data-testid="lucide-pencil" />,
	RotateCcw: () => <span data-testid="lucide-rotate" />,
	Trash2: () => <span data-testid="lucide-trash" />,
	Video: () => <span data-testid="lucide-video" />,
	FileText: () => <span data-testid="lucide-filetext" />,
}));

jest.mock('@/components/ui/file-viewer-modal', () => ({
	FileViewerModal: ({ selectedIndex }: any) =>
		selectedIndex != null ? <div data-testid="file-viewer">{selectedIndex}</div> : null,
}));

jest.mock('@/components/ui/dialog', () => ({
	Dialog: ({ open, children }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
	DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
	DialogHeader: ({ children }: any) => <div>{children}</div>,
	DialogTitle: ({ children }: any) => <h2>{children}</h2>,
	DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

const downloadMock = jest.fn();

const moduleFixture = {
	id: 3,
	title: 'Fundaciones',
	status: 'approved',
	created_at: '2026-08-28T12:00:00Z',
	description: 'Detalle del módulo',
	works: { name: 'Obra Centro' },
};

const defaultProps = {
	open: true,
	onOpenChange: jest.fn(),
	module: moduleFixture as any,
};

const setupDownload = (value: any) => {
	(getSupabaseClient as jest.Mock).mockReturnValue({
		storage: { from: () => ({ download: downloadMock }) },
	});
	downloadMock.mockReset();
	downloadMock.mockResolvedValue(value);
};

const imageBlob = new Blob(['x'], { type: 'image/jpeg' });

describe('ModuleDetailsModal', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		URL.createObjectURL = jest.fn(() => 'blob:mock') as any;
		URL.revokeObjectURL = jest.fn() as any;
		setupDownload({ data: imageBlob });
		(listModuleFiles as jest.Mock).mockResolvedValue({
			data: [
				{
					id: 1,
					storage_path: 'a.jpg',
					file_name: 'foto.jpg',
					description: 'foto desc',
				},
			],
			error: null,
		});
	});

	it('returns null when there is no module', () => {
		render(<ModuleDetailsModal {...defaultProps} module={null} />);
		expect(screen.queryByText('Detalles del módulo y sus archivos.')).not.toBeInTheDocument();
	});

	it('shows a loader while files are loading', () => {
		(listModuleFiles as jest.Mock).mockReturnValue(new Promise(() => {}));
		render(<ModuleDetailsModal {...defaultProps} />);
		expect(screen.getByTestId('lucide-loader')).toBeInTheDocument();
	});

	it('loads and shows module details with its files', async () => {
		render(<ModuleDetailsModal {...defaultProps} />);
		await waitFor(() => {
			expect(screen.getByText('foto.jpg')).toBeInTheDocument();
		});
		expect(screen.getByText('Fundaciones')).toBeInTheDocument();
		expect(screen.getByText('Detalles del módulo y sus archivos.')).toBeInTheDocument();
		expect(screen.getByTestId('status-badge')).toHaveTextContent('approved');
		expect(screen.getByText('28/08/2026')).toBeInTheDocument();
		expect(screen.getByText('Obra:').closest('p')).toHaveTextContent('Obra Centro');
		expect(screen.getByText('Descripción:').closest('p')).toHaveTextContent('Detalle del módulo');
		expect(screen.getByText('Archivos (1)')).toBeInTheDocument();
		expect(screen.getByAltText('foto.jpg')).toBeInTheDocument();
		expect(listModuleFiles).toHaveBeenCalledWith(3);
	});

	it('shows the no-files message', async () => {
		(listModuleFiles as jest.Mock).mockResolvedValue({ data: [], error: null });
		render(<ModuleDetailsModal {...defaultProps} />);
		await waitFor(() => {
			expect(screen.getByText('Este módulo no tiene archivos.')).toBeInTheDocument();
		});
	});

	it('shows an error message with a working Reintentar when a download fails', async () => {
		downloadMock.mockRejectedValueOnce(new Error('blob down'));
		render(<ModuleDetailsModal {...defaultProps} />);
		await waitFor(() => {
			expect(screen.getByText('Error cargando algunos archivos')).toBeInTheDocument();
		});
		expect(screen.getByText(/blob down/)).toBeInTheDocument();
		fireEvent.click(screen.getByText('Reintentar'));
		await waitFor(() => {
			expect(listModuleFiles).toHaveBeenCalledTimes(2);
		});
		await waitFor(() => {
			expect(screen.queryByText('Error cargando algunos archivos')).not.toBeInTheDocument();
			expect(screen.getByAltText('foto.jpg')).toBeInTheDocument();
		});
	});

	it('opens the file viewer when clicking a file', async () => {
		render(<ModuleDetailsModal {...defaultProps} />);
		await waitFor(() => {
			expect(screen.getByText('foto.jpg')).toBeInTheDocument();
		});
		fireEvent.click(screen.getByText('foto.jpg'));
		expect(screen.getByTestId('file-viewer')).toHaveTextContent('0');
	});

	it('shows download button when a file could not be loaded and toasts on failure', async () => {
		downloadMock.mockRejectedValue(new Error('storage down'));
		render(<ModuleDetailsModal {...defaultProps} />);
		await waitFor(() => {
			expect(screen.getByTitle('Descargar archivo')).toBeInTheDocument();
		});
		fireEvent.click(screen.getByTitle('Descargar archivo'));
		await waitFor(() => {
			expect(toast).toHaveBeenCalledWith(
				expect.objectContaining({
					variant: 'destructive',
					title: 'No se pudo descargar',
					description: 'storage down',
				})
			);
		});
	});

	it('downloads a file and triggers the anchor click', async () => {
		const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
		downloadMock.mockResolvedValueOnce({ data: null });
		render(<ModuleDetailsModal {...defaultProps} />);
		await waitFor(() => {
			expect(screen.getByTitle('Descargar archivo')).toBeInTheDocument();
		});
		fireEvent.click(screen.getByTitle('Descargar archivo'));
		await waitFor(() => {
			expect(toast).not.toHaveBeenCalled();
		});
		expect(clickSpy).toHaveBeenCalled();
		expect(URL.revokeObjectURL).toHaveBeenCalled();
		clickSpy.mockRestore();
	});

	it('renders edit and delete buttons when callbacks are provided', async () => {
		const onEdit = jest.fn();
		const onDelete = jest.fn();
		render(<ModuleDetailsModal {...defaultProps} onEdit={onEdit} onDelete={onDelete} />);
		fireEvent.click(screen.getByText('Editar'));
		expect(onEdit).toHaveBeenCalledWith(moduleFixture);
		fireEvent.click(screen.getByText('Eliminar'));
		expect(onDelete).toHaveBeenCalledWith(moduleFixture);
	});

	it('hides edit and delete buttons in view-only mode', async () => {
		render(<ModuleDetailsModal {...defaultProps} />);
		expect(screen.queryByText('Editar')).not.toBeInTheDocument();
		expect(screen.queryByText('Eliminar')).not.toBeInTheDocument();
	});

	it('revokes object URLs when closed', async () => {
		const { rerender } = render(<ModuleDetailsModal {...defaultProps} />);
		await waitFor(() => {
			expect(screen.getByText('foto.jpg')).toBeInTheDocument();
		});
		rerender(<ModuleDetailsModal {...defaultProps} open={false} />);
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
	});
});
