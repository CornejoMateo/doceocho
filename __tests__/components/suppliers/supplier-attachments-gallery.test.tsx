import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SupplierAttachmentsGallery } from '@/components/business/suppliers/supplier-attachments-gallery';
import {
	listFilesWithUrlsByPurchaseSupplierId,
	deleteFilePurchaseSupplier,
} from '@/lib/suppliers/files-purchases-suppliers';
import {
	listFilesWithUrlsByPaymentSupplierId,
	deleteFilePaymentSupplier,
} from '@/lib/suppliers/files-payments-suppliers';

const mockToast = jest.fn();

jest.mock('@/components/ui/use-toast', () => ({
	useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: jest.fn((e: any) => (e ? String(e.message || e) : null)),
}));

jest.mock('@/lib/suppliers/files-purchases-suppliers', () => ({
	listFilesWithUrlsByPurchaseSupplierId: jest.fn(),
	deleteFilePurchaseSupplier: jest.fn(),
}));

jest.mock('@/lib/suppliers/files-payments-suppliers', () => ({
	listFilesWithUrlsByPaymentSupplierId: jest.fn(),
	deleteFilePaymentSupplier: jest.fn(),
}));

jest.mock('@/components/ui/file-viewer-modal', () => ({
	FileViewerModal: ({ files, selectedIndex }: any) =>
		selectedIndex === null ? null : (
			<div data-testid="file-viewer-modal">{files[selectedIndex]?.name}</div>
		),
}));

const imageFile = {
	id: 1,
	url: 'blob:1',
	name: 'factura.jpg',
	displayName: 'factura.jpg',
	description: null,
	mimetype: 'image/jpeg',
	size: 2048,
	uploadedAt: '2026-08-28T12:00:00.000Z',
};

const pdfFile = {
	id: 2,
	url: 'blob:2',
	name: 'recibo.pdf',
	displayName: 'recibo.pdf',
	description: null,
	mimetype: 'application/pdf',
	size: 1024,
	uploadedAt: '2026-09-01T10:00:00.000Z',
};

let createObjectURL: jest.Mock;
let revokeObjectURL: jest.Mock;

beforeEach(() => {
	jest.clearAllMocks();
	createObjectURL = jest.fn(() => 'blob:mock');
	revokeObjectURL = jest.fn();
	URL.createObjectURL = createObjectURL as any;
	URL.revokeObjectURL = revokeObjectURL as any;
	(listFilesWithUrlsByPurchaseSupplierId as jest.Mock).mockResolvedValue({ data: [], error: null });
	(listFilesWithUrlsByPaymentSupplierId as jest.Mock).mockResolvedValue({ data: [], error: null });
	(deleteFilePurchaseSupplier as jest.Mock).mockResolvedValue({ success: true, error: null });
	(deleteFilePaymentSupplier as jest.Mock).mockResolvedValue({ success: true, error: null });
});

const destructiveToasts = () =>
	mockToast.mock.calls.map(([arg]) => arg).filter((a) => a.variant === 'destructive');

describe('SupplierAttachmentsGallery', () => {
	it('renders a chip per file, a thumbnail only for images, and keeps the delete button from opening the viewer', async () => {
		(listFilesWithUrlsByPurchaseSupplierId as jest.Mock).mockResolvedValue({
			data: [imageFile, pdfFile],
			error: null,
		});

		render(<SupplierAttachmentsGallery kind="purchase" entityId={11} />);

		await waitFor(() => expect(listFilesWithUrlsByPurchaseSupplierId).toHaveBeenCalledWith(11));
		expect(await screen.findByAltText('factura.jpg')).toBeInTheDocument();
		expect(screen.getByText('recibo.pdf')).toBeInTheDocument();
		expect(screen.queryByAltText('recibo.pdf')).not.toBeInTheDocument();
		expect(listFilesWithUrlsByPaymentSupplierId).not.toHaveBeenCalled();

		const trashBtns = await screen.findAllByRole('button', { name: 'Eliminar archivo' });
		fireEvent.click(trashBtns[0]);

		expect(screen.queryByTestId('file-viewer-modal')).not.toBeInTheDocument();
		expect(await screen.findByText('¿Eliminar archivo?')).toBeInTheDocument();
		expect(deleteFilePurchaseSupplier).not.toHaveBeenCalled();
	});

	it('loads the purchase list on mount and renders a chip per file', async () => {
		(listFilesWithUrlsByPurchaseSupplierId as jest.Mock).mockResolvedValue({
			data: [imageFile, pdfFile],
			error: null,
		});

		render(<SupplierAttachmentsGallery kind="purchase" entityId={11} />);

		await waitFor(() => expect(listFilesWithUrlsByPurchaseSupplierId).toHaveBeenCalledWith(11));
		expect(await screen.findByAltText('factura.jpg')).toBeInTheDocument();
		// Non-image files fall back to a paperclip icon, no <img>.
		expect(screen.getByText('recibo.pdf')).toBeInTheDocument();
		expect(screen.queryByAltText('recibo.pdf')).not.toBeInTheDocument();
		expect(listFilesWithUrlsByPaymentSupplierId).not.toHaveBeenCalled();
	});

	it('renders the empty state in Spanish when there are no files', async () => {
		render(<SupplierAttachmentsGallery kind="purchase" entityId={11} />);

		expect(await screen.findByText('No hay archivos adjuntos.')).toBeInTheDocument();
	});

	it('routes to the payment lib for kind="payment"', async () => {
		(listFilesWithUrlsByPaymentSupplierId as jest.Mock).mockResolvedValue({
			data: [pdfFile],
			error: null,
		});

		render(<SupplierAttachmentsGallery kind="payment" entityId={22} />);

		await waitFor(() => expect(listFilesWithUrlsByPaymentSupplierId).toHaveBeenCalledWith(22));
		expect(listFilesWithUrlsByPurchaseSupplierId).not.toHaveBeenCalled();
		expect(await screen.findByText('recibo.pdf')).toBeInTheDocument();
	});

	it('opens the viewer when a chip is clicked', async () => {
		(listFilesWithUrlsByPurchaseSupplierId as jest.Mock).mockResolvedValue({
			data: [imageFile],
			error: null,
		});

		render(<SupplierAttachmentsGallery kind="purchase" entityId={11} />);

		const openButton = (await screen.findByAltText('factura.jpg')).closest('button')!;
		fireEvent.click(openButton);

		expect(await screen.findByTestId('file-viewer-modal')).toHaveTextContent('factura.jpg');
	});

	it('does not open the viewer when the trash button is clicked (stopPropagation)', async () => {
		(listFilesWithUrlsByPurchaseSupplierId as jest.Mock).mockResolvedValue({
			data: [imageFile],
			error: null,
		});

		render(<SupplierAttachmentsGallery kind="purchase" entityId={11} />);

		const trashBtns = await screen.findAllByRole('button', { name: 'Eliminar archivo' });
		fireEvent.click(trashBtns[0]);

		expect(screen.queryByTestId('file-viewer-modal')).not.toBeInTheDocument();
		expect(await screen.findByText('¿Eliminar archivo?')).toBeInTheDocument();
		expect(deleteFilePurchaseSupplier).not.toHaveBeenCalled();
	});

	it('deletes the file, toasts, and reloads the list on confirmation', async () => {
		(listFilesWithUrlsByPaymentSupplierId as jest.Mock)
			.mockResolvedValueOnce({ data: [imageFile], error: null })
			.mockResolvedValueOnce({ data: [], error: null });

		render(<SupplierAttachmentsGallery kind="payment" entityId={22} />);
		fireEvent.click(await screen.findByRole('button', { name: 'Eliminar archivo' }));

		fireEvent.click((await screen.findByText('Eliminar')).closest('button')!);

		await waitFor(() => expect(deleteFilePaymentSupplier).toHaveBeenCalledWith(1));
		expect(deleteFilePurchaseSupplier).not.toHaveBeenCalled();
		expect(mockToast).toHaveBeenCalledWith({ title: 'Archivo eliminado' });
		await waitFor(() => expect(listFilesWithUrlsByPaymentSupplierId).toHaveBeenCalledTimes(2));
		expect(await screen.findByText('No hay archivos adjuntos.')).toBeInTheDocument();
	});

	it('reports a failed delete with a destructive toast and does not reload', async () => {
		(deleteFilePurchaseSupplier as jest.Mock).mockResolvedValue({
			success: false,
			error: { message: 'boom' },
		});
		(listFilesWithUrlsByPurchaseSupplierId as jest.Mock).mockResolvedValue({
			data: [imageFile],
			error: null,
		});

		render(<SupplierAttachmentsGallery kind="purchase" entityId={11} />);
		fireEvent.click(await screen.findByRole('button', { name: 'Eliminar archivo' }));

		fireEvent.click((await screen.findByText('Eliminar')).closest('button')!);

		await waitFor(() => expect(destructiveToasts()).toHaveLength(1));
		expect(destructiveToasts()[0].description).toBe('boom');
		expect(listFilesWithUrlsByPurchaseSupplierId).toHaveBeenCalledTimes(1);
	});

	it('revokes the previous object urls when the list is reloaded after a delete', async () => {
		(listFilesWithUrlsByPurchaseSupplierId as jest.Mock)
			.mockResolvedValueOnce({ data: [imageFile], error: null })
			.mockResolvedValueOnce({ data: [pdfFile], error: null });

		render(<SupplierAttachmentsGallery kind="purchase" entityId={11} />);
		fireEvent.click(await screen.findByRole('button', { name: 'Eliminar archivo' }));
		fireEvent.click((await screen.findByText('Eliminar')).closest('button')!);

		await screen.findByText('recibo.pdf');
		expect(revokeObjectURL).toHaveBeenCalledWith('blob:1');
	});

	it('revokes the object urls on unmount', async () => {
		(listFilesWithUrlsByPurchaseSupplierId as jest.Mock).mockResolvedValue({
			data: [imageFile],
			error: null,
		});

		const { unmount } = render(<SupplierAttachmentsGallery kind="purchase" entityId={11} />);
		await screen.findByAltText('factura.jpg');

		unmount();

		expect(revokeObjectURL).toHaveBeenCalledWith('blob:1');
	});

	it('surfaces a list error as a destructive toast and shows nothing', async () => {
		(listFilesWithUrlsByPurchaseSupplierId as jest.Mock).mockResolvedValue({
			data: null,
			error: { message: 'list failed' },
		});

		render(<SupplierAttachmentsGallery kind="purchase" entityId={11} />);

		await waitFor(() => expect(destructiveToasts()).toHaveLength(1));
		expect(destructiveToasts()[0].description).toBe('list failed');
		expect(screen.getByText('No hay archivos adjuntos.')).toBeInTheDocument();
	});

	it('renders a supplied label, and nothing extra when the label is omitted', async () => {
		const withLabel = render(
			<SupplierAttachmentsGallery
				kind="payment"
				entityId={22}
				label="Archivos del pago · $1.000 · 5/3/2026"
			/>
		);

		expect(await screen.findByText('Archivos del pago · $1.000 · 5/3/2026')).toBeInTheDocument();

		withLabel.unmount();

		const withoutLabel = render(<SupplierAttachmentsGallery kind="payment" entityId={22} />);

		await screen.findByText('No hay archivos adjuntos.');
		expect(withoutLabel.container.textContent).toBe('No hay archivos adjuntos.');
	});

	it('ignores a stale response when the entityId changes', async () => {
		let resolveFirst: (v: any) => void = () => {};
		(listFilesWithUrlsByPurchaseSupplierId as jest.Mock)
			.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						resolveFirst = resolve;
					})
			)
			.mockResolvedValueOnce({ data: [pdfFile], error: null });

		const { rerender } = render(<SupplierAttachmentsGallery kind="purchase" entityId={11} />);
		rerender(<SupplierAttachmentsGallery kind="purchase" entityId={12} />);

		// The second, current request settles first and wins.
		expect(await screen.findByText('recibo.pdf')).toBeInTheDocument();

		resolveFirst({ data: [imageFile], error: null });

		await waitFor(() => expect(screen.getByText('recibo.pdf')).toBeInTheDocument());
		expect(screen.queryByAltText('factura.jpg')).not.toBeInTheDocument();
		// The discarded response's object URL is revoked rather than leaked.
		expect(revokeObjectURL).toHaveBeenCalledWith('blob:1');
	});
});
