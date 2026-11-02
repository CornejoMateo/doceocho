import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useState } from 'react';
import {
	SupplierDetailsDialog,
	purchaseStatus,
} from '@/components/business/suppliers/supplier-details-dialog';
import { getSupplierAccountTotals } from '@/lib/suppliers/account-summary';
import { listSupplierPurchasesPage } from '@/lib/suppliers/supplier-expenses';
import { createExpense, updateExpense, deleteExpense } from '@/lib/expenses/expenses';
import {
	createPayment,
	updatePayment,
	deletePayment,
	listPaymentsByExpenseIds,
} from '@/lib/payments/payments';
import { listBankAccounts } from '@/lib/cash-flow/cash-flow';
import { listPaymentMethods } from '@/lib/payment-methods/payment-methods';
import { listCategories } from '@/lib/categories/categories';
import { listWorks } from '@/lib/works/works';
import { listVoucherTypes } from '@/lib/voucher-types/voucher-types';
import { formatCurrency } from '@/utils/formats-money';
import { formatDateOnly, getLocalDate } from '@/utils/format-date';
import { translateError } from '@/lib/error-translator';
import {
	uploadFileExpense,
	listFilesByExpenseIds,
	listFilesWithUrlsByExpenseId,
} from '@/lib/expenses/files-expenses';
import {
	uploadFilePayment,
	listFilesByPaymentIds,
	listFilesWithUrlsByPaymentId,
	signUrlsForPaymentFiles,
} from '@/lib/payments/files-payments';

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

jest.mock('@/components/business/suppliers/supplier-date-filter', () => ({
	SupplierDateFilter: ({ onFilterFromChange, onFilterToChange, onClear }: any) => (
		<div>
			<button type="button" onClick={() => onFilterFromChange('2026-01-01')}>
				Set desde
			</button>
			<button type="button" onClick={() => onFilterToChange('2026-01-31')}>
				Set hasta
			</button>
			<button type="button" onClick={onClear}>
				Limpiar filtro
			</button>
		</div>
	),
}));

jest.mock('@/components/ui/use-toast', () => ({
	useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: jest.fn(),
}));

jest.mock('@/lib/suppliers/account-summary', () => ({
	getSupplierAccountTotals: jest.fn(),
}));

jest.mock('@/lib/suppliers/supplier-expenses', () => ({
	listSupplierPurchasesPage: jest.fn(),
}));

jest.mock('@/lib/expenses/expenses', () => ({
	createExpense: jest.fn(),
	updateExpense: jest.fn(),
	deleteExpense: jest.fn(),
}));

jest.mock('@/lib/payments/payments', () => ({
	createPayment: jest.fn(),
	updatePayment: jest.fn(),
	deletePayment: jest.fn(),
	listPaymentsByExpenseIds: jest.fn(),
}));

jest.mock('@/lib/expenses/files-expenses', () => ({
	listFilesByExpenseIds: jest.fn(),
	listFilesWithUrlsByExpenseId: jest.fn(),
	uploadFileExpense: jest.fn(),
	deleteFileExpense: jest.fn(),
}));

jest.mock('@/lib/payments/files-payments', () => ({
	listFilesByPaymentIds: jest.fn(),
	listFilesWithUrlsByPaymentId: jest.fn(),
	signUrlsForPaymentFiles: jest.fn(),
	uploadFilePayment: jest.fn(),
	deleteFilePayment: jest.fn(),
}));

jest.mock('@/lib/cash-flow/cash-flow', () => ({
	listBankAccounts: jest.fn(),
}));

jest.mock('@/lib/payment-methods/payment-methods', () => ({
	listPaymentMethods: jest.fn(),
}));

jest.mock('@/lib/categories/categories', () => ({
	listCategories: jest.fn(),
}));

jest.mock('@/lib/works/works', () => ({
	listWorks: jest.fn(),
}));

jest.mock('@/lib/voucher-types/voucher-types', () => ({
	listVoucherTypes: jest.fn(),
}));

const purchaseA = {
	id: 11,
	created_at: '2026-01-10',
	date: '2026-01-10',
	voucher_number: null,
	voucher_type_id: null,
	voucher_type_name: null,
	work_id: null,
	work_name: null,
	category_id: null,
	category_name: null,
	payment_method_id: null,
	payment_method_name: null,
	bank_account_id: null,
	bank_account_name: null,
	description: null,
	net_amount: 3000,
	iva_percent: 0,
	iva_amount: 0,
	total_amount: 3000,
	totalPaidArs: 0,
	balanceArs: 3000,
};
const purchaseB = {
	...purchaseA,
	id: 12,
	created_at: '2026-01-05',
	date: '2026-01-05',
	net_amount: 2000,
	total_amount: 2000,
	balanceArs: 2000,
};

const activePaymentMethod = { id: 1, name: 'Efectivo', is_active: true };

// Deliberately distinct from purchaseA/B amounts so money() assertions never collide.
const baseTotals = {
	totalPurchasesArs: 9999,
	totalPaymentsArs: 1111,
	balanceArs: 8888,
	pendingCount: 1,
	paidCount: 0,
};

function page(purchases: any[], totalCount: number) {
	return { data: { purchases, totalCount }, error: null };
}

const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;

// \s (not a literal space) also matches the non-breaking space Intl.NumberFormat('es-AR')
// inserts between the currency symbol and the digits in some ICU builds.
const money = (amount: number) => formatCurrency(amount).replace(/\s/g, ' ');

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
	date: '2026-02-01',
	total_amount: 1000,
	supplier_id: 3,
	description: null,
};
const createdPayment = {
	id: 88,
	created_at: '2026-02-01',
	date: '2026-02-01',
	amount: 1000,
	bank_account_id: null,
	payment_method_id: null,
	expense_id: 11,
	description: null,
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

async function expandPurchase() {
	fireEvent.click(await screen.findByRole('button', { name: 'Mostrar detalle de la compra' }));
}

async function openNewPurchaseForm() {
	openDialog();
	fireEvent.click(await screen.findByRole('button', { name: 'Nueva compra' }));
	fireEvent.change(screen.getByLabelText('Neto'), { target: { value: '1000' } });
	// Medio de pago is optional and defaults to "Sin medio"; most tests still pick a real one.
	// Sync queries: `findBy*` (waitFor/MutationObserver) on an already-open real Radix Select
	// inside a Dialog hangs jsdom indefinitely.
	fireEvent.click(screen.getAllByText('Sin medio')[0]);
	fireEvent.click(screen.getByRole('option', { name: 'Efectivo' }));
}
async function openNewPaymentForm() {
	openDialog();
	await expandPurchase();
	fireEvent.click(await screen.findByRole('button', { name: 'Registrar pago' }));
	fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '1000' } });
}

async function openDeleteConfirmation() {
	openDialog();
	fireEvent.click(await screen.findByRole('button', { name: 'Eliminar compra' }));
	return screen.findByText('¿Eliminar compra?');
}

beforeEach(() => {
	jest.clearAllMocks();
	URL.createObjectURL = jest.fn(() => 'blob:mock') as any;
	URL.revokeObjectURL = jest.fn() as any;
	(getSupplierAccountTotals as jest.Mock).mockResolvedValue({ data: baseTotals, error: null });
	(listSupplierPurchasesPage as jest.Mock).mockImplementation(async ({ status }: any) =>
		status === 'pending' ? page([purchaseA], 1) : page([], 0)
	);
	(listPaymentsByExpenseIds as jest.Mock).mockResolvedValue({ data: [], error: null });
	(listBankAccounts as jest.Mock).mockResolvedValue({ data: [], error: null });
	(listPaymentMethods as jest.Mock).mockResolvedValue({ data: [activePaymentMethod], error: null });
	(listCategories as jest.Mock).mockResolvedValue({ data: [], error: null });
	(listWorks as jest.Mock).mockResolvedValue({ data: [], error: null });
	(listVoucherTypes as jest.Mock).mockResolvedValue({ data: [], error: null });
	(listFilesByExpenseIds as jest.Mock).mockResolvedValue({ data: [], error: null });
	(listFilesByPaymentIds as jest.Mock).mockResolvedValue({ data: [], error: null });
	(listFilesWithUrlsByExpenseId as jest.Mock).mockResolvedValue({ data: [], error: null });
	(listFilesWithUrlsByPaymentId as jest.Mock).mockResolvedValue({ data: [], error: null });
	(signUrlsForPaymentFiles as jest.Mock).mockResolvedValue({ data: [], error: null });
	(uploadFileExpense as jest.Mock).mockResolvedValue({ data: { id: 1 }, error: null });
	(uploadFilePayment as jest.Mock).mockResolvedValue({ data: { id: 1 }, error: null });
	(deleteExpense as jest.Mock).mockResolvedValue({ error: null });
	(deletePayment as jest.Mock).mockResolvedValue({ error: null });
});

describe('SupplierDetailsDialog', () => {
	describe('header totals', () => {
		it('renders the summary from getSupplierAccountTotals, not from the loaded lists', async () => {
			openDialog();

			await waitFor(() => expect(getSupplierAccountTotals).toHaveBeenCalledWith(3));
			expect(await screen.findByText(money(baseTotals.totalPurchasesArs))).toBeInTheDocument();
			expect(screen.getByText(money(baseTotals.totalPaymentsArs))).toBeInTheDocument();
		});

		it('shows the no-purchases empty state and hides the tabs when both counts are zero', async () => {
			(getSupplierAccountTotals as jest.Mock).mockResolvedValue({
				data: { ...baseTotals, pendingCount: 0, paidCount: 0 },
				error: null,
			});
			openDialog();

			expect(
				await screen.findByText('Este proveedor no tiene compras registradas.')
			).toBeInTheDocument();
			expect(screen.queryByRole('tab', { name: /Pendientes/ })).not.toBeInTheDocument();
		});
	});

	describe('tabs and pagination', () => {
		it('fetches only the pending tab on open, and fetches paid only once entered', async () => {
			openDialog();

			await waitFor(() =>
				expect(listSupplierPurchasesPage).toHaveBeenCalledWith(
					expect.objectContaining({ status: 'pending', offset: 0 })
				)
			);
			expect(listSupplierPurchasesPage).not.toHaveBeenCalledWith(
				expect.objectContaining({ status: 'paid' })
			);

			// Radix TabsTrigger switches on mousedown, not click.
			fireEvent.mouseDown(await screen.findByRole('tab', { name: 'Pagadas (0)' }));

			await waitFor(() =>
				expect(listSupplierPurchasesPage).toHaveBeenCalledWith(
					expect.objectContaining({ status: 'paid', offset: 0 })
				)
			);
		});

		it('labels each tab with the counts from totals', async () => {
			(getSupplierAccountTotals as jest.Mock).mockResolvedValue({
				data: { ...baseTotals, pendingCount: 3, paidCount: 2 },
				error: null,
			});
			openDialog();

			expect(await screen.findByRole('tab', { name: 'Pendientes (3)' })).toBeInTheDocument();
			expect(screen.getByRole('tab', { name: 'Pagadas (2)' })).toBeInTheDocument();
		});

		it('"Cargar más" appends the next page and disappears once totalCount is reached', async () => {
			(getSupplierAccountTotals as jest.Mock).mockResolvedValue({
				data: { ...baseTotals, pendingCount: 2 },
				error: null,
			});
			(listSupplierPurchasesPage as jest.Mock).mockImplementation(
				async ({ status, offset }: any) => {
					if (status !== 'pending') return page([], 0);
					return offset === 0 ? page([purchaseA], 2) : page([purchaseB], 2);
				}
			);
			openDialog();

			expect(await screen.findByText(money(purchaseA.total_amount))).toBeInTheDocument();
			expect(screen.queryByText(money(purchaseB.total_amount))).not.toBeInTheDocument();

			fireEvent.click(screen.getByRole('button', { name: 'Cargar más' }));

			expect(await screen.findByText(money(purchaseB.total_amount))).toBeInTheDocument();
			await waitFor(() =>
				expect(screen.queryByRole('button', { name: 'Cargar más' })).not.toBeInTheDocument()
			);
		});

		it('shows the empty-tab copy, and the date-range copy once a filter is active', async () => {
			(listSupplierPurchasesPage as jest.Mock).mockResolvedValue(page([], 0));
			openDialog();

			expect(await screen.findByText('No hay compras pendientes.')).toBeInTheDocument();

			fireEvent.click(screen.getByText('Set desde'));

			await waitFor(() =>
				expect(
					screen.getByText('No hay compras en el rango de fechas seleccionado.')
				).toBeInTheDocument()
			);
		});

		it('resets the current tab to page 1 and passes from/to to the RPC when the date filter changes', async () => {
			openDialog();
			await screen.findByText(money(purchaseA.total_amount));

			fireEvent.click(screen.getByText('Set desde'));
			fireEvent.click(screen.getByText('Set hasta'));

			await waitFor(() =>
				expect(listSupplierPurchasesPage).toHaveBeenCalledWith(
					expect.objectContaining({ from: '2026-01-01', to: '2026-01-31', offset: 0 })
				)
			);
		});

		it('ignores a stale page response after the supplier changes before it resolves', async () => {
			const first = deferred<{ data: any; error: null }>();
			(listSupplierPurchasesPage as jest.Mock).mockImplementation(
				async ({ supplierId, status }: any) => {
					if (status !== 'pending') return page([], 0);
					return supplierId === 3 ? first.promise : page([purchaseB], 1);
				}
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
			await waitFor(() =>
				expect(listSupplierPurchasesPage).toHaveBeenCalledWith(
					expect.objectContaining({ supplierId: 3 })
				)
			);

			fireEvent.click(screen.getByText('Switch'));
			await waitFor(() =>
				expect(listSupplierPurchasesPage).toHaveBeenCalledWith(
					expect.objectContaining({ supplierId: 4 })
				)
			);
			expect(await screen.findByText(money(purchaseB.total_amount))).toBeInTheDocument();

			await act(async () => {
				first.resolve(page([purchaseA], 1));
			});

			expect(screen.getByText(money(purchaseB.total_amount))).toBeInTheDocument();
			expect(screen.queryByText(money(purchaseA.total_amount))).not.toBeInTheDocument();
		});

		it('ignores a stale totals response that resolves after the dialog was closed and reopened', async () => {
			const first = deferred<{ data: typeof baseTotals; error: null }>();
			const staleTotals = { ...baseTotals, totalPurchasesArs: 123 };
			(getSupplierAccountTotals as jest.Mock)
				.mockImplementationOnce(() => first.promise)
				.mockResolvedValue({ data: baseTotals, error: null });

			openDialog();
			await waitFor(() => expect(getSupplierAccountTotals).toHaveBeenCalledTimes(1));

			fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
			await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

			fireEvent.click(screen.getByRole('button', { name: 'Reabrir' }));
			await waitFor(() => expect(getSupplierAccountTotals).toHaveBeenCalledTimes(2));
			expect(await screen.findByText(money(baseTotals.totalPurchasesArs))).toBeInTheDocument();

			await act(async () => {
				first.resolve({ data: staleTotals, error: null });
			});

			expect(screen.getByText(money(baseTotals.totalPurchasesArs))).toBeInTheDocument();
			expect(screen.queryByText(money(123))).not.toBeInTheDocument();
		});
	});

	describe('lazy payment loading on expand', () => {
		it('does not fetch payments while the purchase stays collapsed', async () => {
			openDialog();

			await screen.findByText(money(purchaseA.total_amount));
			expect(listPaymentsByExpenseIds).not.toHaveBeenCalled();
		});

		it('fetches a purchase payments only once it is expanded', async () => {
			openDialog();

			await expandPurchase();

			await waitFor(() => expect(listPaymentsByExpenseIds).toHaveBeenCalledWith([11]));
		});

		it('shows an error with a retry action when loading payments fails, and recovers on retry', async () => {
			(listPaymentsByExpenseIds as jest.Mock)
				.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
				.mockResolvedValueOnce({
					data: [
						{
							id: 88,
							created_at: '2026-01-20',
							date: '2026-01-20',
							amount: 2500,
							bank_account_id: null,
							payment_method_id: null,
							expense_id: 11,
							description: null,
						},
					],
					error: null,
				});
			openDialog();

			await expandPurchase();

			expect(await screen.findByText('No se pudieron cargar los pagos.')).toBeInTheDocument();

			fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

			await waitFor(() => expect(screen.getByText(money(2500))).toBeInTheDocument());
			expect(listPaymentsByExpenseIds).toHaveBeenCalledTimes(2);
		});

		it('renders a payment gallery backed by the batched payment file list', async () => {
			(listPaymentsByExpenseIds as jest.Mock).mockResolvedValue({
				data: [
					{
						id: 88,
						created_at: '2026-01-20',
						date: '2026-01-20',
						amount: 2500,
						bank_account_id: null,
						payment_method_id: null,
						expense_id: 11,
						description: null,
					},
				],
				error: null,
			});
			const paymentFileRow = {
				id: 1,
				created_at: '2026-01-20T00:00:00.000Z',
				storage_path: 'payments/88/uuid-1.jpg',
				payment_id: 88,
				file_name: 'recibo.jpg',
				description: null,
			};
			(listFilesByPaymentIds as jest.Mock).mockResolvedValue({
				data: [paymentFileRow],
				error: null,
			});
			(signUrlsForPaymentFiles as jest.Mock).mockResolvedValue({
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

			await expandPurchase();

			await waitFor(() => expect(listFilesByPaymentIds).toHaveBeenCalledWith([88]));
			await waitFor(() => expect(signUrlsForPaymentFiles).toHaveBeenCalledWith([paymentFileRow]));
			expect(await screen.findByText('recibo.jpg')).toBeInTheDocument();
			// The batch already preloaded the rows: no per-payment live fetch.
			expect(listFilesWithUrlsByPaymentId).not.toHaveBeenCalled();
		});
	});

	describe('after paying a purchase fully', () => {
		it('removes it from Pendientes and updates the tab counts', async () => {
			(createPayment as jest.Mock).mockResolvedValue({ data: createdPayment, error: null });
			(getSupplierAccountTotals as jest.Mock)
				.mockResolvedValueOnce({ data: baseTotals, error: null })
				.mockResolvedValue({ data: { ...baseTotals, pendingCount: 0, paidCount: 1 }, error: null });
			let pendingCalls = 0;
			(listSupplierPurchasesPage as jest.Mock).mockImplementation(async ({ status }: any) => {
				if (status !== 'pending') return page([], 0);
				pendingCalls += 1;
				return pendingCalls === 1 ? page([purchaseA], 1) : page([], 0);
			});
			await openNewPaymentForm();
			fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '5000' } });

			fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

			await waitFor(() => expect(mockToast).toHaveBeenCalledWith({ title: 'Pago creado' }));
			expect(await screen.findByText('No hay compras pendientes.')).toBeInTheDocument();
			expect(await screen.findByRole('tab', { name: 'Pendientes (0)' })).toBeInTheDocument();
			expect(screen.getByRole('tab', { name: 'Pagadas (1)' })).toBeInTheDocument();
		});
	});

	describe('payment date field', () => {
		it('defaults the new payment date to today and submits it as date', async () => {
			(createPayment as jest.Mock).mockResolvedValue({ data: createdPayment, error: null });
			await openNewPaymentForm();

			expect(screen.getByLabelText('Fecha de pago')).toHaveValue(getLocalDate());

			fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

			await waitFor(() => expect(createPayment).toHaveBeenCalledTimes(1));
			expect(createPayment).toHaveBeenCalledWith(expect.objectContaining({ date: getLocalDate() }));
		});

		it('prefills the date field from the payment being edited', async () => {
			(listPaymentsByExpenseIds as jest.Mock).mockResolvedValue({
				data: [{ ...createdPayment, id: 88, date: '2026-03-15' }],
				error: null,
			});
			openDialog();
			await expandPurchase();
			fireEvent.click(await screen.findByRole('button', { name: 'Más acciones del pago' }));
			fireEvent.click(await screen.findByRole('button', { name: 'Editar pago' }));

			expect(await screen.findByLabelText('Fecha de pago')).toHaveValue('2026-03-15');
		});
	});

	describe('purchase form: voucher number, obra, category, payment method and bank account', () => {
		const category = { id: 4, name: 'Materiales', kind: 'expense', is_active: true };
		const work = { id: 9, name: 'Casa Norte' };

		it('creates a purchase without selecting a payment method, sending null', async () => {
			(createExpense as jest.Mock).mockResolvedValue({
				data: createdPurchase,
				error: null,
			});
			openDialog();
			fireEvent.click(await screen.findByRole('button', { name: 'Nueva compra' }));
			fireEvent.change(screen.getByLabelText('Neto'), { target: { value: '1000' } });

			fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

			await waitFor(() => expect(createExpense).toHaveBeenCalledTimes(1));
			expect(createExpense).toHaveBeenCalledWith(
				expect.objectContaining({ payment_method_id: null })
			);
		});

		it('does not require a payment method to update an existing purchase that has none', async () => {
			(updateExpense as jest.Mock).mockResolvedValue({
				data: { ...purchaseA },
				error: null,
			});
			openDialog();
			fireEvent.click(await screen.findByRole('button', { name: 'Más acciones de la compra' }));
			fireEvent.click(await screen.findByRole('button', { name: 'Editar compra' }));

			fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));

			await waitFor(() => expect(updateExpense).toHaveBeenCalledTimes(1));
			expect(updateExpense).toHaveBeenCalledWith(
				purchaseA.id,
				expect.objectContaining({ payment_method_id: null })
			);
		});

		it('allows clearing an existing payment method when editing, sending null', async () => {
			(listSupplierPurchasesPage as jest.Mock).mockImplementation(async ({ status }: any) =>
				status === 'pending' ? page([{ ...purchaseA, payment_method_id: 1 }], 1) : page([], 0)
			);
			(updateExpense as jest.Mock).mockResolvedValue({
				data: { ...purchaseA, payment_method_id: 1 },
				error: null,
			});
			openDialog();
			fireEvent.click(await screen.findByRole('button', { name: 'Más acciones de la compra' }));
			fireEvent.click(await screen.findByRole('button', { name: 'Editar compra' }));

			const triggerLabel = (await screen.findAllByText('Efectivo'))[0];
			fireEvent.click(triggerLabel);
			fireEvent.click(screen.getByRole('option', { name: 'Sin medio' }));

			fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));

			await waitFor(() => expect(updateExpense).toHaveBeenCalledTimes(1));
			expect(updateExpense).toHaveBeenCalledWith(
				purchaseA.id,
				expect.objectContaining({ payment_method_id: null })
			);
		});

		it('sends voucher number and category in the create payload', async () => {
			(listCategories as jest.Mock).mockImplementation(async (kind: string) =>
				kind === 'expense' ? { data: [category], error: null } : { data: [], error: null }
			);
			(createExpense as jest.Mock).mockResolvedValue({
				data: createdPurchase,
				error: null,
			});
			await openNewPurchaseForm();
			fireEvent.change(screen.getByLabelText('N° comprobante (opcional)'), {
				target: { value: 'A-0001' },
			});
			fireEvent.click(screen.getAllByText('Sin categoría')[0]);
			fireEvent.click(screen.getByRole('option', { name: 'Materiales' }));

			fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

			await waitFor(() => expect(createExpense).toHaveBeenCalledTimes(1));
			expect(createExpense).toHaveBeenCalledWith(
				expect.objectContaining({ voucher_number: 'A-0001', category_id: 4 })
			);
		});

		it('keeps a since-deactivated payment method visible (with "(inactivo)") while editing, but not on create', async () => {
			const inactiveMethod = { id: 2, name: 'Cheque', is_active: false };
			(listPaymentMethods as jest.Mock).mockResolvedValue({
				data: [activePaymentMethod, inactiveMethod],
				error: null,
			});
			(listSupplierPurchasesPage as jest.Mock).mockImplementation(async ({ status }: any) =>
				status === 'pending' ? page([{ ...purchaseA, payment_method_id: 2 }], 1) : page([], 0)
			);
			openDialog();
			fireEvent.click(await screen.findByRole('button', { name: 'Más acciones de la compra' }));
			fireEvent.click(await screen.findByRole('button', { name: 'Editar compra' }));

			expect((await screen.findAllByText('Cheque (inactivo)')).length).toBeGreaterThan(0);

			fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
			fireEvent.click(await screen.findByRole('button', { name: 'Nueva compra' }));

			expect(screen.queryByText('Cheque (inactivo)')).not.toBeInTheDocument();
			expect(screen.queryByText('Cheque')).not.toBeInTheDocument();
		});

		it('prefills the obra combobox from the purchase being edited', async () => {
			(listWorks as jest.Mock).mockResolvedValue({ data: [work], error: null });
			openDialog();
			fireEvent.click(await screen.findByRole('button', { name: 'Más acciones de la compra' }));
			fireEvent.click(await screen.findByRole('button', { name: 'Editar compra' }));

			expect(await screen.findByText('Sin obra')).toBeInTheDocument();
		});
	});

	describe('payment form: receipt number, category, and obra inherited from the purchase', () => {
		it('sends work_id from the purchase, not from a form field, and does not render an Obra field', async () => {
			(createPayment as jest.Mock).mockResolvedValue({ data: createdPayment, error: null });
			await openNewPaymentForm();

			expect(screen.queryByLabelText(/^Obra/)).not.toBeInTheDocument();

			fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

			await waitFor(() => expect(createPayment).toHaveBeenCalledTimes(1));
			expect(createPayment).toHaveBeenCalledWith(expect.objectContaining({ work_id: null }));
		});

		it('sends receipt number and category in the payment payload', async () => {
			(createPayment as jest.Mock).mockResolvedValue({ data: createdPayment, error: null });
			(listCategories as jest.Mock).mockImplementation(async (kind: string) =>
				kind === 'payment'
					? { data: [{ id: 6, name: 'Honorarios', kind: 'payment', is_active: true }], error: null }
					: { data: [], error: null }
			);
			await openNewPaymentForm();
			fireEvent.change(screen.getByLabelText('N° comprobante (opcional)'), {
				target: { value: 'R-0099' },
			});
			fireEvent.click(screen.getAllByText('Sin categoría')[0]);
			fireEvent.click(screen.getByRole('option', { name: 'Honorarios' }));

			fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

			await waitFor(() => expect(createPayment).toHaveBeenCalledTimes(1));
			expect(createPayment).toHaveBeenCalledWith(
				expect.objectContaining({ receipt_number: 'R-0099', category_id: 6 })
			);
		});

		it('prefills the bank account and payment method from the purchase when creating a new payment', async () => {
			(listBankAccounts as jest.Mock).mockResolvedValue({
				data: [{ id: 5, name: 'Caja', bank: 'Galicia', is_active: true }],
				error: null,
			});
			(listPaymentMethods as jest.Mock).mockResolvedValue({
				data: [{ id: 2, name: 'Transferencia', is_active: true }],
				error: null,
			});
			(listSupplierPurchasesPage as jest.Mock).mockImplementation(async ({ status }: any) =>
				status === 'pending'
					? page([{ ...purchaseA, bank_account_id: 5, payment_method_id: 2 }], 1)
					: page([], 0)
			);
			(createPayment as jest.Mock).mockResolvedValue({ data: createdPayment, error: null });
			await openNewPaymentForm();

			expect(screen.getAllByText('Galicia - Caja').length).toBeGreaterThan(0);
			expect(screen.getAllByText('Transferencia').length).toBeGreaterThan(0);

			fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

			await waitFor(() => expect(createPayment).toHaveBeenCalledTimes(1));
			expect(createPayment).toHaveBeenCalledWith(
				expect.objectContaining({ bank_account_id: 5, payment_method_id: 2 })
			);
		});

		it('keeps a since-deactivated bank account visible (with "(inactiva)") while editing a payment, but not on create', async () => {
			const inactiveAccount = { id: 6, name: 'Vieja', bank: 'BBVA', is_active: false };
			(listBankAccounts as jest.Mock).mockResolvedValue({
				data: [inactiveAccount],
				error: null,
			});
			(listPaymentsByExpenseIds as jest.Mock).mockResolvedValue({
				data: [{ ...createdPayment, id: 88, bank_account_id: 6 }],
				error: null,
			});
			openDialog();
			await expandPurchase();
			fireEvent.click(await screen.findByRole('button', { name: 'Más acciones del pago' }));
			fireEvent.click(await screen.findByRole('button', { name: 'Editar pago' }));

			expect((await screen.findAllByText('BBVA - Vieja (inactiva)')).length).toBeGreaterThan(0);

			fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
			fireEvent.click(await screen.findByRole('button', { name: 'Registrar pago' }));

			expect(screen.queryByText('BBVA - Vieja (inactiva)')).not.toBeInTheDocument();
			expect(screen.queryByText('BBVA - Vieja')).not.toBeInTheDocument();
		});
	});

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
			expect(uploadFileExpense).not.toHaveBeenCalled();
			expect(createExpense).not.toHaveBeenCalled();
		});

		it('creates the row first, then uploads the staged file with the new row id, in that order', async () => {
			(createExpense as jest.Mock).mockResolvedValue({
				data: createdPurchase,
				error: null,
			});
			await openNewPurchaseForm();
			fireEvent.change(fileInput(), { target: { files: [pdf('factura.pdf')] } });

			fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

			await waitFor(() => expect(uploadFileExpense).toHaveBeenCalledTimes(1));
			expect(createExpense).toHaveBeenCalledWith(
				expect.objectContaining({
					net_amount: 1000,
					iva_percent: 0,
					iva_amount: 0,
					total_amount: 1000,
					supplier_id: 3,
					description: null,
					voucher_number: null,
					work_id: null,
					category_id: null,
					payment_method_id: 1,
					bank_account_id: null,
				})
			);
			expect(uploadFileExpense).toHaveBeenCalledWith(77, expect.anything(), null, 'factura.pdf');
			expect((createExpense as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
				(uploadFileExpense as jest.Mock).mock.invocationCallOrder[0]
			);
		});

		it('uploads every staged file, not just the first', async () => {
			(createExpense as jest.Mock).mockResolvedValue({
				data: createdPurchase,
				error: null,
			});
			await openNewPurchaseForm();
			fireEvent.change(fileInput(), { target: { files: [pdf('a.pdf')] } });
			fireEvent.change(fileInput(), { target: { files: [pdf('b.pdf')] } });

			fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

			await waitFor(() => expect(uploadFileExpense).toHaveBeenCalledTimes(2));
			expect((uploadFileExpense as jest.Mock).mock.calls.map((call) => call[3])).toEqual([
				'a.pdf',
				'b.pdf',
			]);
		});

		it('does the same for a new payment, routing to the payment lib', async () => {
			(createPayment as jest.Mock).mockResolvedValue({ data: createdPayment, error: null });
			await openNewPaymentForm();
			fireEvent.change(fileInput(), { target: { files: [pdf('recibo.pdf')] } });

			fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

			await waitFor(() => expect(uploadFilePayment).toHaveBeenCalledTimes(1));
			expect(uploadFilePayment).toHaveBeenCalledWith(88, expect.anything(), null, 'recibo.pdf');
			expect(uploadFileExpense).not.toHaveBeenCalled();
		});

		it('returns to the detail view after creating a payment, not the payment edit form', async () => {
			(createPayment as jest.Mock).mockResolvedValue({ data: createdPayment, error: null });
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
			expect(createPayment).toHaveBeenCalledTimes(1);
			expect(updatePayment).not.toHaveBeenCalled();
		});

		it('keeps the payment row when an upload fails', async () => {
			(createPayment as jest.Mock).mockResolvedValue({ data: createdPayment, error: null });
			(uploadFilePayment as jest.Mock).mockResolvedValue({ data: null, error: 'boom' });
			await openNewPaymentForm();
			fireEvent.change(fileInput(), { target: { files: [pdf('recibo.pdf')] } });

			fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

			await waitFor(() => expect(mockToast).toHaveBeenCalled());
			expect(updatePayment).not.toHaveBeenCalled();
			expect(createPayment).toHaveBeenCalledTimes(1);
			expect(destructiveToasts()[0]).toEqual(
				expect.objectContaining({ title: 'Archivos adjuntos pendientes' })
			);
			await waitFor(() =>
				expect(screen.getByText('Cuenta corriente del proveedor')).toBeInTheDocument()
			);
			expect(screen.queryByText('Editar pago')).not.toBeInTheDocument();
		});

		it('clears the staged list and reports the count when every upload succeeds', async () => {
			(createExpense as jest.Mock).mockResolvedValue({
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
			(createExpense as jest.Mock).mockResolvedValue({
				data: createdPurchase,
				error: null,
			});
			await openNewPurchaseForm();

			fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

			await waitFor(() => expect(mockToast).toHaveBeenCalled());
			expect(mockToast).toHaveBeenCalledWith({ title: 'Compra creada' });
			expect(uploadFileExpense).not.toHaveBeenCalled();
		});

		it('keeps the row and reports the count when only some uploads fail', async () => {
			(createExpense as jest.Mock).mockResolvedValue({
				data: createdPurchase,
				error: null,
			});
			(uploadFileExpense as jest.Mock)
				.mockResolvedValueOnce({ data: null, error: 'boom' })
				.mockResolvedValueOnce({ data: { id: 2 }, error: null });
			await openNewPurchaseForm();
			fireEvent.change(fileInput(), { target: { files: [pdf('a.pdf')] } });
			fireEvent.change(fileInput(), { target: { files: [pdf('b.pdf')] } });

			fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

			await waitFor(() => expect(mockToast).toHaveBeenCalled());
			// The typed-in data survives: no rollback of the purchase row.
			expect(updateExpense).not.toHaveBeenCalled();
			expect(createExpense).toHaveBeenCalledTimes(1);
			expect(destructiveToasts()).toHaveLength(1);
			expect(destructiveToasts()[0]).toEqual({
				variant: 'destructive',
				title: 'Archivos adjuntos pendientes',
				description:
					'La compra se creó, pero 1 de 2 archivos no se pudo adjuntar. Podés reintentarlos desde la vista de edición.',
			});
			await waitFor(() =>
				expect(screen.getByText('Cuenta corriente del proveedor')).toBeInTheDocument()
			);
			expect(screen.queryByText('Editar compra')).not.toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Editar compra' })).toBeInTheDocument();
		});

		it('counts a throwing upload as a failed file, never as a failed insert', async () => {
			(createExpense as jest.Mock).mockResolvedValue({
				data: createdPurchase,
				error: null,
			});
			(uploadFileExpense as jest.Mock)
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
			expect(uploadFileExpense).toHaveBeenCalledTimes(2);
			expect(createExpense).toHaveBeenCalledTimes(1);
			await waitFor(() =>
				expect(screen.getByText('Cuenta corriente del proveedor')).toBeInTheDocument()
			);
			expect(screen.queryByText('Editar compra')).not.toBeInTheDocument();
		});

		it('clears the staged list when the form is cancelled, without refetching anything', async () => {
			await openNewPurchaseForm();
			fireEvent.change(fileInput(), { target: { files: [pdf('factura.pdf')] } });
			expect(screen.getByText('factura.pdf')).toBeInTheDocument();
			const callsBeforeCancel = (listSupplierPurchasesPage as jest.Mock).mock.calls.length;

			fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

			fireEvent.click(await screen.findByRole('button', { name: 'Nueva compra' }));
			expect(screen.queryByText('factura.pdf')).not.toBeInTheDocument();
			expect(screen.getByText('No hay archivos para adjuntar.')).toBeInTheDocument();
			expect((listSupplierPurchasesPage as jest.Mock).mock.calls.length).toBe(callsBeforeCancel);
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

		it('shows the purchase attachments of a purchase once expanded', async () => {
			(listFilesWithUrlsByExpenseId as jest.Mock).mockResolvedValue({
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

			await expandPurchase();

			expect(await screen.findByAltText('factura.jpg')).toBeInTheDocument();
			expect(listFilesWithUrlsByExpenseId).toHaveBeenCalledWith(11);
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
		it('opens a confirmation naming the amount and the date, with generic copy for files/payments', async () => {
			await openDeleteConfirmation();

			const description = screen.getByText(/Se eliminará permanentemente la compra/);
			const text = description.textContent?.replace(/\s/g, ' ');
			expect(text).toContain('Esta acción no se puede deshacer.');
			expect(text).toContain(money(purchaseA.total_amount));
			expect(description.textContent).toContain(`del ${formatDateOnly('2026-01-10')}`);
			expect(description.textContent).toContain(
				'junto con sus pagos y archivos adjuntos asociados.'
			);
			expect(deleteExpense).not.toHaveBeenCalled();
		});

		it('does not delete when the confirmation is cancelled', async () => {
			await openDeleteConfirmation();

			fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

			await waitFor(() => expect(screen.queryByText('¿Eliminar compra?')).not.toBeInTheDocument());
			expect(deleteExpense).not.toHaveBeenCalled();
		});

		it('deletes the purchase and refetches totals and the pending tab, which drops the row', async () => {
			(getSupplierAccountTotals as jest.Mock)
				.mockResolvedValueOnce({ data: baseTotals, error: null })
				.mockResolvedValue({ data: { ...baseTotals, pendingCount: 0, paidCount: 1 }, error: null });
			let pendingCalls = 0;
			(listSupplierPurchasesPage as jest.Mock).mockImplementation(async ({ status }: any) => {
				if (status !== 'pending') return page([], 0);
				pendingCalls += 1;
				return pendingCalls === 1 ? page([purchaseA], 1) : page([], 0);
			});
			await openDeleteConfirmation();

			fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

			await waitFor(() => expect(deleteExpense).toHaveBeenCalledWith(11));
			expect(mockToast).toHaveBeenCalledWith({ title: 'Compra eliminada' });
			await waitFor(() =>
				expect(screen.getByText('No hay compras pendientes.')).toBeInTheDocument()
			);
			expect(screen.queryByRole('button', { name: 'Editar compra' })).not.toBeInTheDocument();
		});

		it('drops the purchase from the expanded set so its galleries unmount', async () => {
			(listFilesWithUrlsByExpenseId as jest.Mock).mockResolvedValue({
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
			await expandPurchase();
			expect(await screen.findByAltText('factura.jpg')).toBeInTheDocument();

			fireEvent.click(screen.getByRole('button', { name: 'Eliminar compra' }));
			fireEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));

			await waitFor(() => expect(deleteExpense).toHaveBeenCalledWith(11));
			await waitFor(() =>
				expect(
					screen.getByRole('button', { name: 'Mostrar detalle de la compra' })
				).toBeInTheDocument()
			);
			expect(screen.queryByAltText('factura.jpg')).not.toBeInTheDocument();
		});

		it('cannot be submitted twice while the delete is in flight', async () => {
			let releaseDelete: (value: { error: any }) => void = () => {};
			(deleteExpense as jest.Mock).mockImplementation(
				() => new Promise((resolve) => (releaseDelete = resolve))
			);
			await openDeleteConfirmation();

			fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

			const confirming = await screen.findByRole('button', { name: 'Eliminando...' });
			expect(confirming).toBeDisabled();
			fireEvent.click(confirming);
			expect(deleteExpense).toHaveBeenCalledTimes(1);

			releaseDelete({ error: null });
			await waitFor(() => expect(mockToast).toHaveBeenCalledWith({ title: 'Compra eliminada' }));
		});

		it('surfaces a destructive toast with the translated error and keeps the purchase', async () => {
			(translateError as jest.Mock).mockReturnValue('No tenés permisos para eliminar compras.');
			(deleteExpense as jest.Mock).mockResolvedValue({ error: { message: 'forbidden' } });

			await openDeleteConfirmation();
			fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

			await waitFor(() => expect(mockToast).toHaveBeenCalled());
			expect(destructiveToasts()[0]).toEqual({
				variant: 'destructive',
				title: 'Error',
				description: 'No tenés permisos para eliminar compras.',
			});
			expect(screen.getByRole('button', { name: 'Editar compra' })).toBeInTheDocument();
		});

		it('falls back to the generic message when the error cannot be translated', async () => {
			(translateError as jest.Mock).mockReturnValue('');
			(deleteExpense as jest.Mock).mockResolvedValue({ error: { message: 'boom' } });

			await openDeleteConfirmation();
			fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

			await waitFor(() => expect(mockToast).toHaveBeenCalled());
			expect(destructiveToasts()[0]).toEqual(
				expect.objectContaining({ description: 'No se pudo eliminar la compra.' })
			);
		});
	});

	describe('deleting a payment', () => {
		it('deletes a payment and reloads that purchase payments and the active tab', async () => {
			const withPayment = {
				id: 88,
				created_at: '2026-01-20',
				date: '2026-01-20',
				amount: 2500,
				bank_account_id: null,
				payment_method_id: null,
				expense_id: 11,
				description: null,
			};
			(listPaymentsByExpenseIds as jest.Mock)
				.mockResolvedValueOnce({ data: [withPayment], error: null })
				.mockResolvedValue({ data: [], error: null });
			openDialog();
			await expandPurchase();
			await screen.findByText(money(2500));

			fireEvent.click(screen.getByRole('button', { name: 'Eliminar pago' }));
			fireEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));

			await waitFor(() => expect(deletePayment).toHaveBeenCalledWith(88));
			expect(mockToast).toHaveBeenCalledWith({ title: 'Pago eliminado' });
			await waitFor(() => expect(listPaymentsByExpenseIds).toHaveBeenCalledTimes(2));
			await waitFor(() => expect(screen.getByText('Sin pagos registrados.')).toBeInTheDocument());
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
});
