import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { useState } from 'react';
import {
	FileAttachments,
	type StagedFile,
} from '@/components/business/shared/attachments/file-attachments';
import {
	listFilesByExpenseId,
	uploadFileExpense,
	downloadFileExpense,
	deleteFileExpense,
} from '@/lib/expenses/files-expenses';
import {
	listFilesByPaymentId,
	uploadFilePayment,
	downloadFilePayment,
	deleteFilePayment,
} from '@/lib/payments/files-payments';

const mockToast = jest.fn();

jest.mock('@/components/ui/use-toast', () => ({
	useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/lib/expenses/files-expenses', () => ({
	listFilesByExpenseId: jest.fn(),
	uploadFileExpense: jest.fn(),
	downloadFileExpense: jest.fn(),
	deleteFileExpense: jest.fn(),
}));

jest.mock('@/lib/payments/files-payments', () => ({
	listFilesByPaymentId: jest.fn(),
	uploadFilePayment: jest.fn(),
	downloadFilePayment: jest.fn(),
	deleteFilePayment: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: jest.fn(),
}));

const imageFile = (name = 'foto.png') => new File(['imagen'], name, { type: 'image/png' });
const pdfFile = (name = 'factura.pdf') => new File(['pdf'], name, { type: 'application/pdf' });

// 200-char names used to exercise the overflow fix: one unbreakable token, one with spaces.
const longNameNoSpaces = `${'a'.repeat(196)}.pdf`;
const longNameWithSpaces = `${'ab cd '.repeat(40).slice(0, 196)}.pdf`;

let blobCounter = 0;

const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;

const allLibMocks = () => [
	listFilesByExpenseId,
	uploadFileExpense,
	downloadFileExpense,
	deleteFileExpense,
	listFilesByPaymentId,
	uploadFilePayment,
	downloadFilePayment,
	deleteFilePayment,
];

function StagedHarness({ kind = 'expense' }: { kind?: 'expense' | 'payment' }) {
	const [staged, setStaged] = useState<StagedFile[]>([]);
	harnessStaged = staged;
	return (
		<FileAttachments
			kind={kind}
			editKey="cash-flow.suppliers"
			staged={staged}
			onStagedChange={setStaged}
		/>
	);
}

let harnessStaged: StagedFile[] = [];

function renderStaged(kind: 'expense' | 'payment' = 'expense') {
	return render(<StagedHarness kind={kind} />);
}

beforeEach(() => {
	jest.clearAllMocks();
	harnessStaged = [];
	blobCounter = 0;
	URL.createObjectURL = jest.fn(() => `blob:mock-${++blobCounter}`) as any;
	URL.revokeObjectURL = jest.fn() as any;
	(listFilesByExpenseId as jest.Mock).mockResolvedValue({ data: [], error: null });
	(listFilesByPaymentId as jest.Mock).mockResolvedValue({ data: [], error: null });
	(uploadFileExpense as jest.Mock).mockResolvedValue({ data: { id: 1 }, error: null });
	(uploadFilePayment as jest.Mock).mockResolvedValue({ data: { id: 1 }, error: null });
});

describe('FileAttachments', () => {
	describe('staged mode (no entityId)', () => {
		it('does not write anything when a file is selected and renders its name', () => {
			renderStaged('expense');

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
			renderStaged('expense');

			expect(listFilesByExpenseId).not.toHaveBeenCalled();
			expect(listFilesByPaymentId).not.toHaveBeenCalled();
		});

		it('hides the download button, which is meaningless for a staged file', () => {
			renderStaged('expense');

			fireEvent.change(fileInput(), { target: { files: [pdfFile()] } });

			expect(screen.queryByRole('button', { name: 'Descargar' })).not.toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
		});

		it('removes a staged entry and revokes its objectURL on confirm', () => {
			renderStaged('expense');

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
			expect(deleteFileExpense).not.toHaveBeenCalled();
			expect(deleteFilePayment).not.toHaveBeenCalled();
		});

		it('gives an image file a previewUrl and a PDF none', () => {
			renderStaged('expense');

			fireEvent.change(fileInput(), { target: { files: [imageFile('foto.png')] } });
			expect(harnessStaged[0].previewUrl).toBe('blob:mock-1');
			expect(screen.getByRole('img', { name: 'foto.png' })).toHaveAttribute('src', 'blob:mock-1');

			fireEvent.change(fileInput(), { target: { files: [pdfFile('factura.pdf')] } });
			expect(harnessStaged[1].previewUrl).toBeUndefined();
			expect(screen.queryByRole('img', { name: 'factura.pdf' })).not.toBeInTheDocument();
			expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
		});

		it('gives each staged entry a distinct id', () => {
			renderStaged('expense');

			fireEvent.change(fileInput(), { target: { files: [imageFile('a.png')] } });
			fireEvent.change(fileInput(), { target: { files: [imageFile('b.png')] } });

			expect(harnessStaged.map((entry) => entry.id)).toHaveLength(2);
			expect(harnessStaged[0].id).not.toBe(harnessStaged[1].id);
		});

		it('revokes outstanding objectURLs on unmount', () => {
			const view = renderStaged('expense');

			fireEvent.change(fileInput(), { target: { files: [imageFile('foto.png')] } });
			act(() => view.unmount());

			expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-1');
		});

		it.each([
			['without spaces', longNameNoSpaces],
			['with spaces', longNameWithSpaces],
		])(
			'truncates a 200-char name (%s) in the staged row and exposes it via title',
			(_label, name) => {
				renderStaged('expense');

				fireEvent.change(fileInput(), { target: { files: [pdfFile(name)] } });

				const nameSpan = screen.getByText(name);
				expect(nameSpan).toHaveClass('truncate');
				expect(nameSpan).toHaveAttribute('title', name);
				expect(nameSpan.closest('li')).toHaveClass('min-w-0');
				expect(nameSpan.closest('ul')).toHaveClass('min-w-0');
			}
		);

		it('wraps the file name with break-all in the delete confirmation dialog', () => {
			renderStaged('expense');

			fireEvent.change(fileInput(), { target: { files: [pdfFile(longNameNoSpaces)] } });
			fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

			const dialog = screen.getByRole('alertdialog');
			const dialogName = within(dialog).getByText(longNameNoSpaces);
			expect(dialogName).toHaveClass('break-all');
		});
	});

	describe('live mode (with entityId)', () => {
		it('uploads a selected purchase file immediately and lists the result', async () => {
			const file = pdfFile('factura.pdf');
			(listFilesByExpenseId as jest.Mock).mockResolvedValue({
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
			render(<FileAttachments kind="expense" editKey="cash-flow.suppliers" entityId={7} />);

			expect(await screen.findByText('factura.pdf')).toBeInTheDocument();
			expect(listFilesByExpenseId).toHaveBeenCalledWith(7);

			fireEvent.change(fileInput(), { target: { files: [file] } });

			await waitFor(() => expect(uploadFileExpense).toHaveBeenCalledWith(7, file));
			expect(uploadFilePayment).not.toHaveBeenCalled();
			expect(URL.createObjectURL).not.toHaveBeenCalled();
		});

		it('routes kind "payment" to the payment libs', async () => {
			const file = pdfFile('recibo.pdf');
			(listFilesByPaymentId as jest.Mock).mockResolvedValue({
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
			render(<FileAttachments kind="payment" editKey="cash-flow.suppliers" entityId={4} />);

			expect(await screen.findByText('recibo.pdf')).toBeInTheDocument();
			expect(listFilesByPaymentId).toHaveBeenCalledWith(4);
			expect(listFilesByExpenseId).not.toHaveBeenCalled();

			fireEvent.change(fileInput(), { target: { files: [file] } });

			await waitFor(() => expect(uploadFilePayment).toHaveBeenCalledWith(4, file));
			expect(uploadFileExpense).not.toHaveBeenCalled();
		});

		it('keeps the live empty state and offers download', async () => {
			render(<FileAttachments kind="expense" editKey="cash-flow.suppliers" entityId={7} />);

			expect(await screen.findByText('No hay archivos adjuntos.')).toBeInTheDocument();
			expect(screen.queryByText('No hay archivos para adjuntar.')).not.toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Descargar' })).not.toBeInTheDocument();
		});

		it('deletes a live file through the confirmation dialog and refetches', async () => {
			(listFilesByExpenseId as jest.Mock).mockResolvedValue({
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
			(deleteFileExpense as jest.Mock).mockResolvedValue({
				success: true,
				error: null,
			});
			render(<FileAttachments kind="expense" editKey="cash-flow.suppliers" entityId={7} />);
			await screen.findByText('factura.pdf');

			fireEvent.click(screen.getByRole('button', { name: 'Descargar' }));
			await waitFor(() => expect(mockToast).toHaveBeenCalled());

			fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
			const dialog = screen.getByRole('alertdialog');
			fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

			await waitFor(() => expect(deleteFileExpense).toHaveBeenCalledWith(9));
			expect(deleteFilePayment).not.toHaveBeenCalled();
		});

		it.each([
			['without spaces', longNameNoSpaces],
			['with spaces', longNameWithSpaces],
		])(
			'truncates a 200-char name (%s) in the live row and exposes it via title',
			async (_label, name) => {
				(listFilesByExpenseId as jest.Mock).mockResolvedValue({
					data: [
						{
							id: 9,
							created_at: '2026-01-15',
							storage_path: 'purchases/7/x.pdf',
							file_name: name,
							description: null,
						},
					],
					error: null,
				});
				render(<FileAttachments kind="expense" editKey="cash-flow.suppliers" entityId={7} />);

				const nameSpan = await screen.findByText(name);
				expect(nameSpan).toHaveClass('truncate');
				expect(nameSpan).toHaveAttribute('title', name);
				expect(nameSpan.closest('li')).toHaveClass('min-w-0');
				expect(nameSpan.closest('ul')).toHaveClass('min-w-0');
			}
		);
	});
});
