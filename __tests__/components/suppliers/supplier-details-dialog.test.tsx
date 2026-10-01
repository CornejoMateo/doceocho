import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useState } from 'react';
import {
	SupplierDetailsDialog,
	purchaseStatus,
	inDateRange,
} from '@/components/business/suppliers/supplier-details-dialog';
import { getSupplierAccountDetail } from '@/lib/suppliers/account-summary';
import {
	createPurchaseSupplier,
	updatePurchaseSupplier,
	deletePurchaseSupplier,
} from '@/lib/suppliers/purchases-suppliers';
import {
	createPaymentSupplier,
	updatePaymentSupplier,
	deletePaymentSupplier,
} from '@/lib/suppliers/payments-suppliers';
import { listBankAccounts } from '@/lib/cash-flow/cash-flow';
import { listPaymentMethods } from '@/lib/payment-methods/payment-methods';
import { formatCurrency } from '@/utils/formats-money';
import { formatShortDate } from '@/utils/format-date';
import { translateError } from '@/lib/error-translator';
import {
	uploadFilePurchaseSupplier,
	listFilesByPurchaseSupplierId,
	listFilesByPurchaseSupplierIds,
	listFilesWithUrlsByPurchaseSupplierId,
	signUrlsForPurchaseSupplierFiles,
} from '@/lib/suppliers/files-purchases-suppliers';
import {
	uploadFilePaymentSupplier,
	listFilesByPaymentSupplierIds,
	listFilesWithUrlsByPaymentSupplierId,
	signUrlsForPaymentSupplierFiles,
} from '@/lib/suppliers/files-payments-suppliers';

const mockToast = jest.fn();

jest.mock('@/components/ui/dropdown-menu', () => ({
	DropdownMenu: ({ children }: any) => <>{children}</>,
	DropdownMenuTrigger: ({ children }: any) => <>{children}</>,
	DropdownMenuContent: ({ children }: any) => <>{children}</>,
	DropdownMenuItem: ({ children, onSelect, variant, ...props }: any) => (
		<button type="button" onClick={onSelect} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/use-toast', () => ({
	useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: jest.fn(),
}));

jest.mock('@/lib/suppliers/account-summary', () => ({
	getSupplierAccountDetail: jest.fn(),
}));

jest.mock('@/lib/suppliers/purchases-suppliers', () => ({
	createPurchaseSupplier: jest.fn(),
	updatePurchaseSupplier: jest.fn(),
	deletePurchaseSupplier: jest.fn(),
}));

jest.mock('@/lib/suppliers/payments-suppliers', () => ({
	createPaymentSupplier: jest.fn(),
	updatePaymentSupplier: jest.fn(),
	deletePaymentSupplier: jest.fn(),
}));

jest.mock('@/lib/suppliers/files-purchases-suppliers', () => ({
	listFilesByPurchaseSupplierId: jest.fn(),
	listFilesByPurchaseSupplierIds: jest.fn(),
	listFilesWithUrlsByPurchaseSupplierId: jest.fn(),
	signUrlsForPurchaseSupplierFiles: jest.fn(),
	uploadFilePurchaseSupplier: jest.fn(),
	downloadFilePurchaseSupplier: jest.fn(),
	deleteFilePurchaseSupplier: jest.fn(),
}));

jest.mock('@/lib/suppliers/files-payments-suppliers', () => ({
	listFilesByPaymentSupplierIds: jest.fn(),
	listFilesWithUrlsByPaymentSupplierId: jest.fn(),
	signUrlsForPaymentSupplierFiles: jest.fn(),
	uploadFilePaymentSupplier: jest.fn(),
	downloadFilePaymentSupplier: jest.fn(),
	deleteFilePaymentSupplier: jest.fn(),
}));

jest.mock('@/lib/cash-flow/cash-flow', () => ({
	listBankAccounts: jest.fn(),
}));

jest.mock('@/lib/payment-methods/payment-methods', () => ({
	listPaymentMethods: jest.fn(),
}));

const purchase = {
	id: 11,
	created_at: '2026-01-10',
	amount_ars: 5000,
	supplier_id: 3,
	notes: null,
	payments: [],
	totalPaidArs: 0,
	balanceArs: 5000,
};

const detail = {
	supplier_id: 3,
	purchases: [purchase],
	totalPurchasesArs: 5000,
	totalPaymentsArs: 0,
	balanceArs: 5000,
};

const detailSuccess = { data: detail, error: null };

const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;

const money = (amount: number) => formatCurrency(amount).replace(/\u00a0/g, ' ');

const pdf = (name: string) => new File(['pdf'], name, { type: 'application/pdf' });

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

const createdPurchase = {
	id: 77,
	created_at: '2026-02-01',
	amount_ars: 1000,
	supplier_id: 3,
	notes: null,
};
const createdPayment = {
	id: 88,
	created_at: '2026-02-01',
	amount_ars: 1000,
	bank_account_id: null,
	payment_method_id: null,
	purchase_supplier_id: 11,
	notes: null,
};

function DialogHarness() {
	const [open, setOpen] = useState(true);
	return (
		<>
			<button type="button" onClick={() => setOpen(true)}>
				Reabrir
			</button>
			<SupplierDetailsDialog
				supplierId={3}
				supplierName="Vidrios SA"
				open={open}
				onOpenChange={setOpen}
			/>
		</>
	);
}

function openDialog() {
	return render(<DialogHarness />);
}

const destructiveToasts = () =>
	mockToast.mock.calls.map(([arg]) => arg).filter((a) => a.variant === 'destructive');

async function openNewPurchaseForm() {
	openDialog();
	fireEvent.click(await screen.findByRole('button', { name: 'Nueva compra' }));
	fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '1000' } });
}
async function openNewPaymentForm() {
	openDialog();
	fireEvent.click(await screen.findByRole('button', { name: 'Mostrar detalle de la compra' }));
	fireEvent.click(await screen.findByRole('button', { name: 'Registrar pago' }));
	fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '1000' } });
}

beforeEach(() => {
	jest.clearAllMocks();
	URL.createObjectURL = jest.fn(() => 'blob:mock') as any;
	URL.revokeObjectURL = jest.fn() as any;
	(getSupplierAccountDetail as jest.Mock).mockResolvedValue(detailSuccess);
	(listBankAccounts as jest.Mock).mockResolvedValue({ data: [], error: null });
	(listPaymentMethods as jest.Mock).mockResolvedValue({ data: [], error: null });
	(listFilesByPurchaseSupplierId as jest.Mock).mockResolvedValue({ data: [], error: null });
	(listFilesByPurchaseSupplierIds as jest.Mock).mockResolvedValue({ data: [], error: null });
	(listFilesByPaymentSupplierIds as jest.Mock).mockResolvedValue({ data: [], error: null });
	(listFilesWithUrlsByPurchaseSupplierId as jest.Mock).mockResolvedValue({ data: [], error: null });
	(listFilesWithUrlsByPaymentSupplierId as jest.Mock).mockResolvedValue({ data: [], error: null });
	(signUrlsForPurchaseSupplierFiles as jest.Mock).mockResolvedValue({ data: [], error: null });
	(signUrlsForPaymentSupplierFiles as jest.Mock).mockResolvedValue({ data: [], error: null });
	(uploadFilePurchaseSupplier as jest.Mock).mockResolvedValue({ data: { id: 1 }, error: null });
	(uploadFilePaymentSupplier as jest.Mock).mockResolvedValue({ data: { id: 1 }, error: null });
	(deletePurchaseSupplier as jest.Mock).mockResolvedValue({ error: null });
	(deletePaymentSupplier as jest.Mock).mockResolvedValue({ error: null });
});

/** Opens the delete confirmation of the existing purchase from the detail view. */
async function openDeleteConfirmation() {
	openDialog();
	fireEvent.click(await screen.findByRole('button', { name: 'Eliminar compra' }));
	return screen.findByText('¿Eliminar compra?');
}

describe('SupplierDetailsDialog', () => {
	describe('staged attachments in the create form', () => {
		it('renders the attachments section in create mode, where it used to be hidden', async () => {
			await openNewPurchaseForm();

			expect(screen.getByText('Archivos adjuntos')).toBeInTheDocument();
			expect(screen.getByText('No hay archivos para adjuntar.')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Adjuntar' })).toBeInTheDocument();
		});

		it('stages a picked file without writing anything until the form is saved', async () => {
			await openNewPurchaseForm();

			fireEvent.change(fileInput(), { target: { files: [pdf('factura.pdf')] } });

			expect(screen.getByText('factura.pdf')).toBeInTheDocument();
			expect(uploadFilePurchaseSupplier).not.toHaveBeenCalled();
			expect(createPurchaseSupplier).not.toHaveBeenCalled();
		});

		it('creates the row first, then uploads the staged file with the new row id, in that order', async () => {
			(createPurchaseSupplier as jest.Mock).mockResolvedValue({
				data: createdPurchase,
				error: null,
			});
			await openNewPurchaseForm();
			fireEvent.change(fileInput(), { target: { files: [pdf('factura.pdf')] } });

			fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

			await waitFor(() => expect(uploadFilePurchaseSupplier).toHaveBeenCalledTimes(1));
			expect(createPurchaseSupplier).toHaveBeenCalledWith({
				amount_ars: 1000,
				supplier_id: 3,
				notes: null,
			});
			expect(uploadFilePurchaseSupplier).toHaveBeenCalledWith(
				77,
				expect.anything(),
				null,
				'factura.pdf'
			);
			expect((createPurchaseSupplier as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
				(uploadFilePurchaseSupplier as jest.Mock).mock.invocationCallOrder[0]
			);
		});

		it('uploads every staged file, not just the first', async () => {
			(createPurchaseSupplier as jest.Mock).mockResolvedValue({
				data: createdPurchase,
				error: null,
			});
			await openNewPurchaseForm();
			fireEvent.change(fileInput(), { target: { files: [pdf('a.pdf')] } });
			fireEvent.change(fileInput(), { target: { files: [pdf('b.pdf')] } });

			fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

			await waitFor(() => expect(uploadFilePurchaseSupplier).toHaveBeenCalledTimes(2));
			expect((uploadFilePurchaseSupplier as jest.Mock).mock.calls.map((call) => call[3])).toEqual([
				'a.pdf',
				'b.pdf',
			]);
		});

		it('does the same for a new payment, routing to the payment lib', async () => {
			(createPaymentSupplier as jest.Mock).mockResolvedValue({ data: createdPayment, error: null });
			await openNewPaymentForm();
			fireEvent.change(fileInput(), { target: { files: [pdf('recibo.pdf')] } });

			fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

			await waitFor(() => expect(uploadFilePaymentSupplier).toHaveBeenCalledTimes(1));
			expect(uploadFilePaymentSupplier).toHaveBeenCalledWith(
				88,
				expect.anything(),
				null,
				'recibo.pdf'
			);
			expect(uploadFilePurchaseSupplier).not.toHaveBeenCalled();
		});

		it('clears the staged list and reports the count when every upload succeeds', async () => {
			(createPurchaseSupplier as jest.Mock).mockResolvedValue({
				data: createdPurchase,
				error: null,
			});
			await openNewPurchaseForm();
			fireEvent.change(fileInput(), { target: { files: [pdf('a.pdf')] } });

			fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

			await waitFor(() => expect(mockToast).toHaveBeenCalled());
			expect(destructiveToasts()).toHaveLength(0);
			expect(mockToast).toHaveBeenCalledWith({
				title: 'Compra creada',
				description: 'Se adjuntó 1 archivo.',
			});
			await waitFor(() =>
				expect(screen.getByText('Cuenta corriente del proveedor')).toBeInTheDocument()
			);
			expect(screen.queryByText('Editar compra')).not.toBeInTheDocument();
			expect(screen.queryByText('a.pdf')).not.toBeInTheDocument();
			fireEvent.click(screen.getByRole('button', { name: 'Nueva compra' }));
			expect(screen.getByText('No hay archivos para adjuntar.')).toBeInTheDocument();
			expect(screen.queryByText('a.pdf')).not.toBeInTheDocument();
		});

		it('still uses the plain success toast when nothing was staged', async () => {
			(createPurchaseSupplier as jest.Mock).mockResolvedValue({
				data: createdPurchase,
				error: null,
			});
			await openNewPurchaseForm();

			fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

			await waitFor(() => expect(mockToast).toHaveBeenCalled());
			expect(mockToast).toHaveBeenCalledWith({ title: 'Compra creada' });
			expect(uploadFilePurchaseSupplier).not.toHaveBeenCalled();
		});

		it('keeps the row and reports the count when only some uploads fail', async () => {
			(createPurchaseSupplier as jest.Mock).mockResolvedValue({
				data: createdPurchase,
				error: null,
			});
			(uploadFilePurchaseSupplier as jest.Mock)
				.mockResolvedValueOnce({ data: null, error: 'boom' })
				.mockResolvedValueOnce({ data: { id: 2 }, error: null });
			await openNewPurchaseForm();
			fireEvent.change(fileInput(), { target: { files: [pdf('a.pdf')] } });
			fireEvent.change(fileInput(), { target: { files: [pdf('b.pdf')] } });

			fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

			await waitFor(() => expect(mockToast).toHaveBeenCalled());
			// The typed-in data survives: no rollback of the purchase row.
			expect(updatePurchaseSupplier).not.toHaveBeenCalled();
			expect(createPurchaseSupplier).toHaveBeenCalledTimes(1);
			expect(mockToast).not.toHaveBeenCalledWith(
				expect.objectContaining({ description: 'No se pudo guardar la compra.' })
			);
			expect(destructiveToasts()).toHaveLength(1);
			expect(destructiveToasts()[0]).toEqual({
				variant: 'destructive',
				title: 'Archivos adjuntos pendientes',
				description:
					'La compra se creó, pero 1 de 2 archivos no se pudo adjuntar. Podés reintentarlos desde la vista de edición.',
			});
			// The row is still there to retry from, on the detail view.
			await waitFor(() =>
				expect(screen.getByText('Cuenta corriente del proveedor')).toBeInTheDocument()
			);
			expect(screen.queryByText('Editar compra')).not.toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Editar compra' })).toBeInTheDocument();
		});

		it('counts a throwing upload as a failed file, never as a failed insert', async () => {
			(createPurchaseSupplier as jest.Mock).mockResolvedValue({
				data: createdPurchase,
				error: null,
			});
			(uploadFilePurchaseSupplier as jest.Mock)
				.mockImplementationOnce(() => {
					throw new Error('boom');
				})
				.mockResolvedValueOnce({ data: { id: 2 }, error: null });
			await openNewPurchaseForm();
			fireEvent.change(fileInput(), { target: { files: [pdf('a.pdf')] } });
			fireEvent.change(fileInput(), { target: { files: [pdf('b.pdf')] } });

			fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

			await waitFor(() => expect(mockToast).toHaveBeenCalled());
			// The trap itself: an insert-failure toast for a row that exists.
			expect(mockToast).not.toHaveBeenCalledWith(
				expect.objectContaining({ description: 'No se pudo guardar la compra.' })
			);
			expect(mockToast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Error' }));
			expect(destructiveToasts()).toHaveLength(1);
			expect(destructiveToasts()[0]).toEqual({
				variant: 'destructive',
				title: 'Archivos adjuntos pendientes',
				description:
					'La compra se creó, pero 1 de 2 archivos no se pudo adjuntar. Podés reintentarlos desde la vista de edición.',
			});
			expect(uploadFilePurchaseSupplier).toHaveBeenCalledTimes(2);
			expect(createPurchaseSupplier).toHaveBeenCalledTimes(1);
			await waitFor(() =>
				expect(screen.getByText('Cuenta corriente del proveedor')).toBeInTheDocument()
			);
			expect(screen.queryByText('Editar compra')).not.toBeInTheDocument();
		});

		it('returns to the detail view after creating a payment, not the payment edit form', async () => {
			(createPaymentSupplier as jest.Mock).mockResolvedValue({ data: createdPayment, error: null });
			await openNewPaymentForm();

			fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

			await waitFor(() => expect(mockToast).toHaveBeenCalled());
			expect(mockToast).toHaveBeenCalledWith({ title: 'Pago creado' });
			await waitFor(() =>
				expect(screen.getByText('Cuenta corriente del proveedor')).toBeInTheDocument()
			);
			expect(screen.queryByText('Editar pago')).not.toBeInTheDocument();
			// The payment form (and its submit button) is gone entirely.
			expect(screen.queryByRole('button', { name: 'Crear' })).not.toBeInTheDocument();
			expect(createPaymentSupplier).toHaveBeenCalledTimes(1);
			expect(updatePaymentSupplier).not.toHaveBeenCalled();
		});

		it('keeps the payment row when an upload fails', async () => {
			(createPaymentSupplier as jest.Mock).mockResolvedValue({ data: createdPayment, error: null });
			(uploadFilePaymentSupplier as jest.Mock).mockResolvedValue({ data: null, error: 'boom' });
			await openNewPaymentForm();
			fireEvent.change(fileInput(), { target: { files: [pdf('recibo.pdf')] } });

			fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

			await waitFor(() => expect(mockToast).toHaveBeenCalled());
			expect(updatePaymentSupplier).not.toHaveBeenCalled();
			expect(createPaymentSupplier).toHaveBeenCalledTimes(1);
			expect(destructiveToasts()[0]).toEqual(
				expect.objectContaining({ title: 'Archivos adjuntos pendientes' })
			);
			await waitFor(() =>
				expect(screen.getByText('Cuenta corriente del proveedor')).toBeInTheDocument()
			);
			expect(screen.queryByText('Editar pago')).not.toBeInTheDocument();
		});

		it('clears the staged list when the form is cancelled', async () => {
			await openNewPurchaseForm();
			fireEvent.change(fileInput(), { target: { files: [pdf('factura.pdf')] } });
			expect(screen.getByText('factura.pdf')).toBeInTheDocument();

			fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

			fireEvent.click(await screen.findByRole('button', { name: 'Nueva compra' }));
			expect(screen.queryByText('factura.pdf')).not.toBeInTheDocument();
			expect(screen.getByText('No hay archivos para adjuntar.')).toBeInTheDocument();
		});

		it('clears the staged list when the dialog is closed', async () => {
			await openNewPurchaseForm();
			fireEvent.change(fileInput(), { target: { files: [pdf('factura.pdf')] } });

			fireEvent.click(screen.getByRole('button', { name: 'Close' }));
			await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

			fireEvent.click(screen.getByRole('button', { name: 'Reabrir' }));
			fireEvent.click(await screen.findByRole('button', { name: 'Nueva compra' }));
			expect(screen.queryByText('factura.pdf')).not.toBeInTheDocument();
			expect(screen.getByText('No hay archivos para adjuntar.')).toBeInTheDocument();
		});

		it('shows the purchase attachments of a purchase with zero payments once expanded', async () => {
			(listFilesWithUrlsByPurchaseSupplierId as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 1,
						url: 'blob:1',
						name: 'factura.jpg',
						displayName: 'factura.jpg',
						description: null,
						mimetype: 'image/jpeg',
						size: 1024,
						uploadedAt: '2026-01-10T00:00:00.000Z',
					},
				],
				error: null,
			});
			openDialog();

			fireEvent.click(await screen.findByRole('button', { name: 'Mostrar detalle de la compra' }));

			expect(await screen.findByAltText('factura.jpg')).toBeInTheDocument();
			expect(listFilesWithUrlsByPurchaseSupplierId).toHaveBeenCalledWith(11);
		});

		it('does not fetch any attachments while the purchase stays collapsed', async () => {
			openDialog();

			await screen.findByText('Cuenta corriente del proveedor');
			expect(listFilesWithUrlsByPurchaseSupplierId).not.toHaveBeenCalled();
			expect(listFilesWithUrlsByPaymentSupplierId).not.toHaveBeenCalled();
		});

		it('renders a payment gallery per payment inside the expanded block', async () => {
			(getSupplierAccountDetail as jest.Mock).mockResolvedValue({
				data: {
					...detail,
					purchases: [
						{
							...purchase,
							balanceArs: 2500,
							payments: [
								{
									id: 88,
									created_at: '2026-01-20',
									amount_ars: 2500,
									bank_account_id: null,
									payment_method_id: null,
									purchase_supplier_id: 11,
									notes: null,
								},
							],
						},
					],
				},
				error: null,
			});
			const paymentFileRow = {
				id: 1,
				created_at: '2026-01-20T00:00:00.000Z',
				storage_path: 'payments/88/uuid-1.jpg',
				payment_supplier_id: 88,
				file_name: 'recibo.jpg',
				description: null,
			};
			(listFilesByPaymentSupplierIds as jest.Mock).mockResolvedValue({
				data: [paymentFileRow],
				error: null,
			});
			(signUrlsForPaymentSupplierFiles as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 1,
						url: 'https://signed/payments/88/uuid-1.jpg',
						name: 'recibo.jpg',
						displayName: 'recibo.jpg',
						description: null,
						mimetype: null,
						size: null,
						uploadedAt: '2026-01-20T00:00:00.000Z',
					},
				],
				error: null,
			});
			openDialog();

			fireEvent.click(await screen.findByRole('button', { name: 'Mostrar detalle de la compra' }));

			await waitFor(() => expect(listFilesByPaymentSupplierIds).toHaveBeenCalledWith([88]));
			await waitFor(() =>
				expect(signUrlsForPaymentSupplierFiles).toHaveBeenCalledWith([paymentFileRow])
			);
			expect(listFilesWithUrlsByPurchaseSupplierId).toHaveBeenCalledWith(11);
			expect(screen.getByText('Comprobantes de compra')).toBeInTheDocument();
			expect(await screen.findByText('recibo.jpg')).toBeInTheDocument();
			// The batch already preloaded the rows: no per-payment list query.
			expect(listFilesWithUrlsByPaymentSupplierId).not.toHaveBeenCalled();
		});

		it('falls back to the payment gallery own live fetch when the batched payment file list errors', async () => {
			(getSupplierAccountDetail as jest.Mock).mockResolvedValue({
				data: {
					...detail,
					purchases: [
						{
							...purchase,
							balanceArs: 2500,
							payments: [
								{
									id: 88,
									created_at: '2026-01-20',
									amount_ars: 2500,
									bank_account_id: null,
									payment_method_id: null,
									purchase_supplier_id: 11,
									notes: null,
								},
							],
						},
					],
				},
				error: null,
			});
			(listFilesByPaymentSupplierIds as jest.Mock).mockResolvedValue({
				data: null,
				error: { message: 'batch failed' },
			});
			(listFilesWithUrlsByPaymentSupplierId as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 1,
						url: 'https://signed/payments/88/uuid-1.jpg',
						name: 'recibo.jpg',
						displayName: 'recibo.jpg',
						description: null,
						mimetype: null,
						size: null,
						uploadedAt: '2026-01-20T00:00:00.000Z',
					},
				],
				error: null,
			});
			openDialog();

			fireEvent.click(await screen.findByRole('button', { name: 'Mostrar detalle de la compra' }));

			await waitFor(() => expect(listFilesWithUrlsByPaymentSupplierId).toHaveBeenCalledWith(88));
			expect(await screen.findByText('recibo.jpg')).toBeInTheDocument();
			// Preloading never succeeded, so the gallery never got raw rows to sign.
			expect(signUrlsForPaymentSupplierFiles).not.toHaveBeenCalled();
		});

		it('self-corrects the "N archivos" badge once a signing failure drops a file from the gallery', async () => {
			(getSupplierAccountDetail as jest.Mock).mockResolvedValue({
				data: {
					...detail,
					purchases: [
						{
							...purchase,
							balanceArs: 2500,
							payments: [
								{
									id: 88,
									created_at: '2026-01-20',
									amount_ars: 2500,
									bank_account_id: null,
									payment_method_id: null,
									purchase_supplier_id: 11,
									notes: null,
								},
							],
						},
					],
				},
				error: null,
			});
			const rowA = {
				id: 1,
				created_at: '2026-01-20T00:00:00.000Z',
				storage_path: 'payments/88/uuid-1.jpg',
				payment_supplier_id: 88,
				file_name: 'a.jpg',
				description: null,
			};
			const rowB = { ...rowA, id: 2, storage_path: 'payments/88/uuid-2.jpg', file_name: 'b.jpg' };
			(listFilesByPaymentSupplierIds as jest.Mock).mockResolvedValue({
				data: [rowA, rowB],
				error: null,
			});
			// Row B's signing failed and was silently dropped: only one item comes back.
			(signUrlsForPaymentSupplierFiles as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 1,
						url: 'https://signed/payments/88/uuid-1.jpg',
						name: 'a.jpg',
						displayName: 'a.jpg',
						description: null,
						mimetype: null,
						size: null,
						uploadedAt: '2026-01-20T00:00:00.000Z',
					},
				],
				error: null,
			});
			openDialog();

			fireEvent.click(await screen.findByRole('button', { name: 'Mostrar detalle de la compra' }));

			expect(await screen.findByText('a.jpg')).toBeInTheDocument();
			// The raw row count was 2, but the badge settles on the post-signing count of 1.
			await waitFor(() => expect(screen.getByText(/· 1 archivo$/)).toBeInTheDocument());
			expect(screen.queryByText(/· 2 archivos/)).not.toBeInTheDocument();
		});

		it('nests each payment gallery under its own payment row', async () => {
			const paymentOne = {
				id: 88,
				created_at: '2026-01-20',
				amount_ars: 1111,
				bank_account_id: null,
				payment_method_id: null,
				purchase_supplier_id: 11,
				notes: null,
			};
			const paymentTwo = {
				id: 99,
				created_at: '2026-01-25',
				amount_ars: 2222,
				bank_account_id: null,
				payment_method_id: null,
				purchase_supplier_id: 11,
				notes: null,
			};
			(getSupplierAccountDetail as jest.Mock).mockResolvedValue({
				data: {
					...detail,
					purchases: [
						{
							...purchase,
							balanceArs: 5000,
							payments: [paymentOne, paymentTwo],
						},
					],
				},
				error: null,
			});
			// Each payment gets its own file row, so the tiles identify their owner.
			(listFilesByPaymentSupplierIds as jest.Mock).mockImplementation(async (ids: number[]) => ({
				data: ids.map((id) => ({
					id: 1000 + id,
					created_at: '2026-01-20T00:00:00.000Z',
					storage_path: `payments/${id}/uuid.jpg`,
					payment_supplier_id: id,
					file_name: `recibo-${id}.jpg`,
					description: null,
				})),
				error: null,
			}));
			(signUrlsForPaymentSupplierFiles as jest.Mock).mockImplementation(async (files: any[]) => ({
				data: files.map((f) => ({
					id: f.id,
					url: `https://signed/${f.storage_path}`,
					name: f.file_name,
					displayName: f.file_name,
					description: f.description,
					mimetype: null,
					size: null,
					uploadedAt: f.created_at,
				})),
				error: null,
			}));
			openDialog();

			fireEvent.click(await screen.findByRole('button', { name: 'Mostrar detalle de la compra' }));

			const paymentRow = async (paymentId: number) => {
				const tile = await screen.findByAltText(`recibo-${paymentId}.jpg`);
				const row = tile.closest(`li[data-payment-id="${paymentId}"]`) as HTMLElement;
				return { tile, row };
			};
			const one = await paymentRow(paymentOne.id);
			const two = await paymentRow(paymentTwo.id);

			expect(one.row).toContainElement(screen.getByText(money(paymentOne.amount_ars)));
			expect(one.row).not.toContainElement(screen.getByText(money(paymentTwo.amount_ars)));
			expect(two.row).toContainElement(screen.getByText(money(paymentTwo.amount_ars)));
			expect(two.row).not.toContainElement(screen.getByText(money(paymentOne.amount_ars)));

			expect(screen.getByText('Comprobantes de compra')).toBeInTheDocument();
		});

		it('keeps staged payment files out of the purchase form', async () => {
			await openNewPaymentForm();
			fireEvent.change(fileInput(), { target: { files: [pdf('recibo.pdf')] } });

			fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
			fireEvent.click(await screen.findByRole('button', { name: 'Nueva compra' }));

			expect(screen.queryByText('recibo.pdf')).not.toBeInTheDocument();
		});
	});

	describe('deleting a purchase', () => {
		it('opens a confirmation naming the amount and the payments it takes with it', async () => {
			(getSupplierAccountDetail as jest.Mock).mockResolvedValue({
				data: {
					...detail,
					purchases: [
						{
							...purchase,
							balanceArs: 2500,
							payments: [
								{
									id: 88,
									created_at: '2026-01-20',
									amount_ars: 2500,
									bank_account_id: null,
									payment_method_id: null,
									purchase_supplier_id: 11,
									notes: null,
								},
							],
						},
					],
				},
				error: null,
			});

			await openDeleteConfirmation();

			await waitFor(() => expect(listFilesByPurchaseSupplierIds).toHaveBeenCalledWith([11]));

			// The description is split by the amount <span>, so assert its full text.
			const description = screen.getByText(/Se eliminará permanentemente la compra/);
			const text = description.textContent?.replace(/\u00a0/g, ' ');
			expect(text).toContain('Esta acción no se puede deshacer.');
			expect(text).toContain(money(purchase.amount_ars));
			expect(description.textContent).toContain(`del ${formatShortDate('2026-01-10')}`);
			expect(description.textContent).toContain('junto con sus archivos y pagos asociados.');
			expect(deletePurchaseSupplier).not.toHaveBeenCalled();
		});

		it('does not delete when the confirmation is cancelled', async () => {
			await openDeleteConfirmation();

			fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

			await waitFor(() => expect(screen.queryByText('¿Eliminar compra?')).not.toBeInTheDocument());
			expect(deletePurchaseSupplier).not.toHaveBeenCalled();
		});

		it('deletes the purchase and refetches the list, which drops the row', async () => {
			const noPurchases = {
				data: {
					...detail,
					purchases: [],
					totalPurchasesArs: 0,
					totalPaymentsArs: 0,
					balanceArs: 0,
				},
				error: null,
			};
			(getSupplierAccountDetail as jest.Mock)
				.mockResolvedValueOnce(detailSuccess)
				.mockResolvedValue(noPurchases);
			await openDeleteConfirmation();

			fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

			await waitFor(() => expect(deletePurchaseSupplier).toHaveBeenCalledWith(11));
			expect(mockToast).toHaveBeenCalledWith({ title: 'Compra eliminada' });
			await waitFor(() =>
				expect(screen.getByText('Este proveedor no tiene compras registradas.')).toBeInTheDocument()
			);
			expect(screen.queryByRole('button', { name: 'Editar compra' })).not.toBeInTheDocument();
			expect(getSupplierAccountDetail).toHaveBeenCalledTimes(2);
		});

		it('drops the purchase from the expanded set so its galleries unmount', async () => {
			(listFilesWithUrlsByPurchaseSupplierId as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 1,
						url: 'blob:1',
						name: 'factura.jpg',
						displayName: 'factura.jpg',
						description: null,
						mimetype: 'image/jpeg',
						size: 1024,
						uploadedAt: '2026-01-10T00:00:00.000Z',
					},
				],
				error: null,
			});
			openDialog();
			fireEvent.click(await screen.findByRole('button', { name: 'Mostrar detalle de la compra' }));
			expect(await screen.findByAltText('factura.jpg')).toBeInTheDocument();

			fireEvent.click(screen.getByRole('button', { name: 'Eliminar compra' }));
			fireEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));

			await waitFor(() => expect(deletePurchaseSupplier).toHaveBeenCalledWith(11));
			await waitFor(() =>
				expect(
					screen.getByRole('button', { name: 'Mostrar detalle de la compra' })
				).toBeInTheDocument()
			);
			expect(screen.queryByAltText('factura.jpg')).not.toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Editar compra' })).toBeInTheDocument();
		});

		it('cannot be submitted twice while the delete is in flight', async () => {
			let releaseDelete: (value: { error: any }) => void = () => {};
			(deletePurchaseSupplier as jest.Mock).mockImplementation(
				() => new Promise((resolve) => (releaseDelete = resolve))
			);
			await openDeleteConfirmation();

			fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

			const confirming = await screen.findByRole('button', { name: 'Eliminando...' });
			expect(confirming).toBeDisabled();
			fireEvent.click(confirming);
			expect(deletePurchaseSupplier).toHaveBeenCalledTimes(1);

			releaseDelete({ error: null });
			await waitFor(() => expect(mockToast).toHaveBeenCalledWith({ title: 'Compra eliminada' }));
		});

		it('surfaces a destructive toast with the translated error and keeps the purchase', async () => {
			(translateError as jest.Mock).mockReturnValue('No tenés permisos para eliminar compras.');
			(deletePurchaseSupplier as jest.Mock).mockResolvedValue({ error: { message: 'forbidden' } });

			await openDeleteConfirmation();
			fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

			await waitFor(() => expect(mockToast).toHaveBeenCalled());
			expect(destructiveToasts()[0]).toEqual({
				variant: 'destructive',
				title: 'Error',
				description: 'No tenés permisos para eliminar compras.',
			});
			// Nothing was deleted, so the row and its edit trigger stay put.
			expect(getSupplierAccountDetail).toHaveBeenCalledTimes(1);
			expect(screen.getByRole('button', { name: 'Editar compra' })).toBeInTheDocument();
		});

		it('falls back to the generic message when the error cannot be translated', async () => {
			(translateError as jest.Mock).mockReturnValue('');
			(deletePurchaseSupplier as jest.Mock).mockResolvedValue({ error: { message: 'boom' } });

			await openDeleteConfirmation();
			fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

			await waitFor(() => expect(mockToast).toHaveBeenCalled());
			expect(destructiveToasts()[0]).toEqual(
				expect.objectContaining({ description: 'No se pudo eliminar la compra.' })
			);
		});
	});

	describe('purchaseStatus', () => {
		it('classifies an unpaid purchase as pendiente', () => {
			expect(purchaseStatus({ balanceArs: 5000, totalPaidArs: 0 })).toBe('pendiente');
		});

		it('classifies a purchase with some payment left to pay as parcial', () => {
			expect(purchaseStatus({ balanceArs: 600, totalPaidArs: 400 })).toBe('parcial');
		});

		it('classifies an exactly-zero balance as pagada', () => {
			expect(purchaseStatus({ balanceArs: 0, totalPaidArs: 1000 })).toBe('pagada');
		});

		it('rounds a floating-point balance before classifying, so 0.1 + 0.1 + 0.1 against 0.3 reads as pagada, not a-favor', () => {
			const balanceArs = 0.3 - (0.1 + 0.1 + 0.1);
			expect(balanceArs).not.toBe(0); // sanity check: the float artifact exists
			expect(purchaseStatus({ balanceArs, totalPaidArs: 0.3 })).toBe('pagada');
		});

		it('classifies an overpayment as a-favor (Saldo a favor)', () => {
			expect(purchaseStatus({ balanceArs: -50, totalPaidArs: 150 })).toBe('a-favor');
		});
	});

	describe('inDateRange', () => {
		it('matches any date when no filter is set', () => {
			expect(inDateRange('2026-03-14T12:00:00.000Z', '', '')).toBe(true);
		});

		it('includes both range boundaries', () => {
			expect(inDateRange('2026-03-14T12:00:00.000Z', '2026-03-14', '2026-03-14')).toBe(true);
			expect(inDateRange('2026-03-14T12:00:00.000Z', '2026-03-10', '2026-03-14')).toBe(true);
			expect(inDateRange('2026-03-14T12:00:00.000Z', '2026-03-14', '2026-03-20')).toBe(true);
		});

		it('excludes dates outside the range', () => {
			expect(inDateRange('2026-03-14T12:00:00.000Z', '2026-03-15', '')).toBe(false);
			expect(inDateRange('2026-03-14T12:00:00.000Z', '', '2026-03-13')).toBe(false);
		});

		it('compares using the Argentina-local day, not the UTC day, for a timestamp that crosses midnight UTC', () => {
			// 2026-03-15T01:30:00Z is 2026-03-14 22:30 in Argentina (UTC-3): a
			// filter on the 14th must match it, and a filter on the 15th must not,
			// even though the raw ISO string's date portion is "2026-03-15".
			const timestamp = '2026-03-15T01:30:00.000Z';
			expect(inDateRange(timestamp, '2026-03-14', '2026-03-14')).toBe(true);
			expect(inDateRange(timestamp, '2026-03-15', '2026-03-15')).toBe(false);
		});
	});

	describe('fetchDetail stale-response guard', () => {
		it('ignores a stale response when supplierId changes before the first fetch resolves', async () => {
			const first = deferred<{ data: typeof detail; error: null }>();
			const staleData = { ...detail, totalPurchasesArs: 123 };
			const freshData = { ...detail, totalPurchasesArs: 7777 };
			(getSupplierAccountDetail as jest.Mock).mockImplementation((id: number) =>
				id === 3 ? first.promise : Promise.resolve({ data: freshData, error: null })
			);

			function SwitchSupplierHarness() {
				const [supplierId, setSupplierId] = useState(3);
				return (
					<>
						<button type="button" onClick={() => setSupplierId(4)}>
							Switch
						</button>
						<SupplierDetailsDialog
							supplierId={supplierId}
							supplierName="Vidrios SA"
							open={true}
							onOpenChange={() => {}}
						/>
					</>
				);
			}

			render(<SwitchSupplierHarness />);
			await waitFor(() => expect(getSupplierAccountDetail).toHaveBeenCalledWith(3));

			fireEvent.click(screen.getByText('Switch'));
			await waitFor(() => expect(getSupplierAccountDetail).toHaveBeenCalledWith(4));
			expect(await screen.findByText(money(7777))).toBeInTheDocument();
			await act(async () => {
				first.resolve({ data: staleData, error: null });
			});

			expect(screen.getByText(money(7777))).toBeInTheDocument();
			expect(screen.queryByText(money(123))).not.toBeInTheDocument();
		});

		it('ignores a stale response that resolves after the dialog was closed and reopened', async () => {
			const first = deferred<{ data: typeof detail; error: null }>();
			const staleData = { ...detail, totalPurchasesArs: 123 };
			(getSupplierAccountDetail as jest.Mock)
				.mockImplementationOnce(() => first.promise)
				.mockResolvedValue(detailSuccess);

			openDialog();
			await waitFor(() => expect(getSupplierAccountDetail).toHaveBeenCalledTimes(1));

			fireEvent.click(screen.getByRole('button', { name: 'Close' }));
			await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

			fireEvent.click(screen.getByRole('button', { name: 'Reabrir' }));
			await waitFor(() => expect(getSupplierAccountDetail).toHaveBeenCalledTimes(2));
			await screen.findByText('Cuenta corriente del proveedor');
			expect(screen.getAllByText(money(detail.totalPurchasesArs)).length).toBeGreaterThan(0);
			await act(async () => {
				first.resolve({ data: staleData, error: null });
			});

			expect(screen.getAllByText(money(detail.totalPurchasesArs)).length).toBeGreaterThan(0);
			expect(screen.queryByText(money(123))).not.toBeInTheDocument();
		});
	});
});
