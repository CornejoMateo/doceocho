import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { useState } from 'react';
import {
	SupplierFileAttachments,
	type StagedFile,
} from '@/components/business/suppliers/supplier-file-attachments';
import {
	listFilesByPurchaseSupplierId,
	uploadFilePurchaseSupplier,
	downloadFilePurchaseSupplier,
	deleteFilePurchaseSupplier,
} from '@/lib/suppliers/files-purchases-suppliers';
import {
	listFilesByPaymentSupplierId,
	uploadFilePaymentSupplier,
	downloadFilePaymentSupplier,
	deleteFilePaymentSupplier,
} from '@/lib/suppliers/files-payments-suppliers';

const mockToast = jest.fn();

jest.mock('@/components/ui/use-toast', () => ({
	useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/lib/suppliers/files-purchases-suppliers', () => ({
	listFilesByPurchaseSupplierId: jest.fn(),
	uploadFilePurchaseSupplier: jest.fn(),
	downloadFilePurchaseSupplier: jest.fn(),
	deleteFilePurchaseSupplier: jest.fn(),
}));

jest.mock('@/lib/suppliers/files-payments-suppliers', () => ({
	listFilesByPaymentSupplierId: jest.fn(),
	uploadFilePaymentSupplier: jest.fn(),
	downloadFilePaymentSupplier: jest.fn(),
	deleteFilePaymentSupplier: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: jest.fn(),
}));

const imageFile = (name = 'foto.png') => new File(['imagen'], name, { type: 'image/png' });
const pdfFile = (name = 'factura.pdf') => new File(['pdf'], name, { type: 'application/pdf' });

let blobCounter = 0;

const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;

const allLibMocks = () => [
	listFilesByPurchaseSupplierId,
	uploadFilePurchaseSupplier,
	downloadFilePurchaseSupplier,
	deleteFilePurchaseSupplier,
	listFilesByPaymentSupplierId,
	uploadFilePaymentSupplier,
	downloadFilePaymentSupplier,
	deleteFilePaymentSupplier,
];

function StagedHarness({ kind = 'purchase' }: { kind?: 'purchase' | 'payment' }) {
	const [staged, setStaged] = useState<StagedFile[]>([]);
	harnessStaged = staged;
	return <SupplierFileAttachments kind={kind} staged={staged} onStagedChange={setStaged} />;
}

let harnessStaged: StagedFile[] = [];

function renderStaged(kind: 'purchase' | 'payment' = 'purchase') {
	return render(<StagedHarness kind={kind} />);
}

beforeEach(() => {
	jest.clearAllMocks();
	harnessStaged = [];
	blobCounter = 0;
	URL.createObjectURL = jest.fn(() => `blob:mock-${++blobCounter}`) as any;
	URL.revokeObjectURL = jest.fn() as any;
	(listFilesByPurchaseSupplierId as jest.Mock).mockResolvedValue({ data: [], error: null });
	(listFilesByPaymentSupplierId as jest.Mock).mockResolvedValue({ data: [], error: null });
	(uploadFilePurchaseSupplier as jest.Mock).mockResolvedValue({ data: { id: 1 }, error: null });
	(uploadFilePaymentSupplier as jest.Mock).mockResolvedValue({ data: { id: 1 }, error: null });
});

describe('SupplierFileAttachments', () => {
	describe('staged mode (no entityId)', () => {
		it('does not write anything when a file is selected and renders its name', () => {
			renderStaged('purchase');

			expect(screen.getByText('No hay archivos para adjuntar.')).toBeInTheDocument();

			fireEvent.change(fileInput(), { target: { files: [imageFile('factura.png')] } });

			expect(screen.getByText('factura.png')).toBeInTheDocument();
			expect(screen.queryByText('No hay archivos para adjuntar.')).not.toBeInTheDocument();
			for (const fn of allLibMocks()) expect(fn).not.toHaveBeenCalled();
		});

		it('routes kind "payment" to the payment libs — and still writes nothing while staged', () => {
			renderStaged('payment');

			fireEvent.change(fileInput(), { target: { files: [pdfFile('recibo.pdf')] } });

			expect(screen.getByText('recibo.pdf')).toBeInTheDocument();
			for (const fn of allLibMocks()) expect(fn).not.toHaveBeenCalled();
		});

		it('never lists files, since the parent row does not exist yet', () => {
			renderStaged('purchase');

			expect(listFilesByPurchaseSupplierId).not.toHaveBeenCalled();
			expect(listFilesByPaymentSupplierId).not.toHaveBeenCalled();
		});

		it('hides the download button, which is meaningless for a staged file', () => {
			renderStaged('purchase');

			fireEvent.change(fileInput(), { target: { files: [pdfFile()] } });

			expect(screen.queryByRole('button', { name: 'Descargar' })).not.toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
		});

		it('removes a staged entry and revokes its objectURL on confirm', () => {
			renderStaged('purchase');

			fireEvent.change(fileInput(), { target: { files: [imageFile('foto.png')] } });
			fireEvent.change(fileInput(), { target: { files: [pdfFile('factura.pdf')] } });
			expect(URL.createObjectURL).toHaveBeenCalledTimes(1);

			fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
			const dialog = screen.getByRole('alertdialog');
			expect(within(dialog).getByText('foto.png')).toBeInTheDocument();
			fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

			expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-1');
			expect(screen.queryByText('foto.png')).not.toBeInTheDocument();
			expect(screen.getByText('factura.pdf')).toBeInTheDocument();
			expect(harnessStaged).toHaveLength(1);
			expect(harnessStaged[0].fileName).toBe('factura.pdf');
			expect(deleteFilePurchaseSupplier).not.toHaveBeenCalled();
			expect(deleteFilePaymentSupplier).not.toHaveBeenCalled();
		});

		it('gives an image file a previewUrl and a PDF none', () => {
			renderStaged('purchase');

			fireEvent.change(fileInput(), { target: { files: [imageFile('foto.png')] } });
			expect(harnessStaged[0].previewUrl).toBe('blob:mock-1');
			expect(screen.getByRole('img', { name: 'foto.png' })).toHaveAttribute('src', 'blob:mock-1');

			fireEvent.change(fileInput(), { target: { files: [pdfFile('factura.pdf')] } });
			expect(harnessStaged[1].previewUrl).toBeUndefined();
			expect(screen.queryByRole('img', { name: 'factura.pdf' })).not.toBeInTheDocument();
			expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
		});

		it('gives each staged entry a distinct id', () => {
			renderStaged('purchase');

			fireEvent.change(fileInput(), { target: { files: [imageFile('a.png')] } });
			fireEvent.change(fileInput(), { target: { files: [imageFile('b.png')] } });

			expect(harnessStaged.map((entry) => entry.id)).toHaveLength(2);
			expect(harnessStaged[0].id).not.toBe(harnessStaged[1].id);
		});

		it('revokes outstanding objectURLs on unmount', () => {
			const view = renderStaged('purchase');

			fireEvent.change(fileInput(), { target: { files: [imageFile('foto.png')] } });
			act(() => view.unmount());

			expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-1');
		});
	});

	describe('live mode (with entityId)', () => {
		it('uploads a selected purchase file immediately and lists the result', async () => {
			const file = pdfFile('factura.pdf');
			(listFilesByPurchaseSupplierId as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 9,
						created_at: '2026-01-15',
						storage_path: 'purchases/7/x.pdf',
						file_name: 'factura.pdf',
						description: null,
					},
				],
				error: null,
			});
			render(<SupplierFileAttachments kind="purchase" entityId={7} />);

			expect(await screen.findByText('factura.pdf')).toBeInTheDocument();
			expect(listFilesByPurchaseSupplierId).toHaveBeenCalledWith(7);

			fireEvent.change(fileInput(), { target: { files: [file] } });

			await waitFor(() => expect(uploadFilePurchaseSupplier).toHaveBeenCalledWith(7, file));
			expect(uploadFilePaymentSupplier).not.toHaveBeenCalled();
			expect(URL.createObjectURL).not.toHaveBeenCalled();
		});

		it('routes kind "payment" to the payment libs', async () => {
			const file = pdfFile('recibo.pdf');
			(listFilesByPaymentSupplierId as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 3,
						created_at: '2026-01-15',
						storage_path: 'payments/4/x.pdf',
						file_name: 'recibo.pdf',
						description: null,
					},
				],
				error: null,
			});
			render(<SupplierFileAttachments kind="payment" entityId={4} />);

			expect(await screen.findByText('recibo.pdf')).toBeInTheDocument();
			expect(listFilesByPaymentSupplierId).toHaveBeenCalledWith(4);
			expect(listFilesByPurchaseSupplierId).not.toHaveBeenCalled();

			fireEvent.change(fileInput(), { target: { files: [file] } });

			await waitFor(() => expect(uploadFilePaymentSupplier).toHaveBeenCalledWith(4, file));
			expect(uploadFilePurchaseSupplier).not.toHaveBeenCalled();
		});

		it('keeps the live empty state and offers download', async () => {
			render(<SupplierFileAttachments kind="purchase" entityId={7} />);

			expect(await screen.findByText('No hay archivos adjuntos.')).toBeInTheDocument();
			expect(screen.queryByText('No hay archivos para adjuntar.')).not.toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Descargar' })).not.toBeInTheDocument();
		});

		it('deletes a live file through the confirmation dialog and refetches', async () => {
			(listFilesByPurchaseSupplierId as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 9,
						created_at: '2026-01-15',
						storage_path: 'purchases/7/x.pdf',
						file_name: 'factura.pdf',
						description: null,
					},
				],
				error: null,
			});
			(deleteFilePurchaseSupplier as jest.Mock).mockResolvedValue({
				success: true,
				error: null,
			});
			render(<SupplierFileAttachments kind="purchase" entityId={7} />);
			await screen.findByText('factura.pdf');

			fireEvent.click(screen.getByRole('button', { name: 'Descargar' }));
			await waitFor(() => expect(mockToast).toHaveBeenCalled());

			fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
			const dialog = screen.getByRole('alertdialog');
			fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

			await waitFor(() => expect(deleteFilePurchaseSupplier).toHaveBeenCalledWith(9));
			expect(deleteFilePaymentSupplier).not.toHaveBeenCalled();
		});
	});
});
