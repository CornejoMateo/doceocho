import { renderHook, act } from '@testing-library/react';
import { useModuleAdminReview } from '@/hooks/modules/use-module-admin-review';
import { reviewModuleFileAction } from '@/lib/modules/modules-files-review';
import { submitModuleReviewAction } from '@/lib/modules/modules-review-submit';
import { deriveModuleStatusFromFiles } from '@/lib/modules/modules-files';
import { toast } from '@/components/ui/use-toast';

jest.mock('@/lib/modules/modules-files-review', () => ({
	reviewModuleFileAction: jest.fn(),
}));

jest.mock('@/lib/modules/modules-review-submit', () => ({
	submitModuleReviewAction: jest.fn(),
}));

jest.mock('@/lib/modules/modules-files', () => ({
	deriveModuleStatusFromFiles: jest.fn(),
	listModuleFiles: jest.fn(),
}));

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(),
}));

const moduleFixture = {
	id: 3,
	title: 'Fundaciones',
	status: 'pending',
	admin_description: null,
} as any;

const fileFixture = {
	id: 1,
	storage_path: 'a.jpg',
	file_name: 'foto.jpg',
	url: 'blob:1',
	isImg: true,
	isVid: false,
	fileType: 'image/jpeg',
	size: 10,
} as any;

describe('useModuleAdminReview', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(deriveModuleStatusFromFiles as jest.Mock).mockReturnValue('rejected');
		(submitModuleReviewAction as jest.Mock).mockResolvedValue({ success: true });
	});

	it('approves a file: calls the action, updates local state and closes the panel', async () => {
		let resolveReview!: (v: any) => void;
		(reviewModuleFileAction as jest.Mock).mockReturnValue(
			new Promise((res) => {
				resolveReview = res;
			})
		);
		const patchFile = jest.fn();
		const onReviewed = jest.fn();

		const { result } = renderHook(() =>
			useModuleAdminReview({
				open: true,
				module: moduleFixture,
				files: [fileFixture],
				patchFile,
				onReviewed,
			})
		);

		act(() => {
			result.current.startFileReview(1);
			result.current.setReviewText('Looks good');
		});

		act(() => {
			result.current.submitFileReview(fileFixture, 'approved');
		});

		// While the request is in flight, the loading state is scoped to THIS file only.
		expect(result.current.pendingReviewIds.get(1)).toBe('approved');

		await act(async () => {
			resolveReview({ success: true });
		});

		expect(reviewModuleFileAction).toHaveBeenCalledWith(1, 'approved', 'Looks good');
		expect(patchFile).toHaveBeenCalledWith(1, {
			status: 'approved',
			admin_description: 'Looks good',
		});
		expect(result.current.pendingReviewIds.has(1)).toBe(false);
		expect(result.current.reviewingFileId).toBeNull();
		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Archivo aprobado' }));
		// A per-file review must NOT refresh the parent's list (KB: module-admin-response-submission-pivot).
		expect(onReviewed).not.toHaveBeenCalled();
	});

	it('does not apply state or notify when the response arrives after the modal closed', async () => {
		let resolveReview!: (v: any) => void;
		(reviewModuleFileAction as jest.Mock).mockReturnValue(
			new Promise((res) => {
				resolveReview = res;
			})
		);
		const patchFile = jest.fn();
		const onReviewed = jest.fn();

		const { result, rerender } = renderHook(
			({ open }) =>
				useModuleAdminReview({
					open,
					module: moduleFixture,
					files: [fileFixture],
					patchFile,
					onReviewed,
				}),
			{ initialProps: { open: true } }
		);

		act(() => {
			result.current.submitFileReview(fileFixture, 'approved');
		});
		rerender({ open: false });

		await act(async () => {
			resolveReview({ success: true });
		});

		expect(patchFile).not.toHaveBeenCalled();
		expect(toast).not.toHaveBeenCalled();
		expect(onReviewed).not.toHaveBeenCalled();
	});

	it('discards stale responses when the modal was reopened for a DIFFERENT module', async () => {
		let resolveReview!: (v: any) => void;
		(reviewModuleFileAction as jest.Mock).mockReturnValue(
			new Promise((res) => {
				resolveReview = res;
			})
		);
		const patchFile = jest.fn();
		const onReviewed = jest.fn();

		const { result, rerender } = renderHook(
			({ open, module }) =>
				useModuleAdminReview({
					open,
					module,
					files: [fileFixture],
					patchFile,
					onReviewed,
				}),
			{ initialProps: { open: true, module: moduleFixture } }
		);

		act(() => {
			result.current.submitFileReview(fileFixture, 'approved');
		});
		rerender({ open: true, module: { ...moduleFixture, id: 99 } });

		await act(async () => {
			resolveReview({ success: true });
		});

		expect(patchFile).not.toHaveBeenCalled();
		expect(toast).not.toHaveBeenCalled();
		expect(onReviewed).not.toHaveBeenCalled();
	});

	it('opens the amount dialog when the derived outcome would be "approved"', () => {
		(deriveModuleStatusFromFiles as jest.Mock).mockReturnValue('approved');
		const patchFile = jest.fn();

		const { result } = renderHook(() =>
			useModuleAdminReview({ open: true, module: moduleFixture, files: [], patchFile })
		);

		act(() => {
			result.current.handleSendResponseClick();
		});

		expect(result.current.amountModalOpen).toBe(true);
		expect(submitModuleReviewAction).not.toHaveBeenCalled();
	});

	it('submits directly when the derived outcome is a rejection (no amount dialog)', async () => {
		const patchFile = jest.fn();
		const onReviewed = jest.fn();

		const { result } = renderHook(() =>
			useModuleAdminReview({
				open: true,
				module: moduleFixture,
				files: [],
				patchFile,
				onReviewed,
			})
		);

		act(() => {
			result.current.setModuleReviewText('  response  ');
		});
		await act(async () => {
			result.current.handleSendResponseClick();
		});

		expect(result.current.amountModalOpen).toBe(false);
		expect(submitModuleReviewAction).toHaveBeenCalledWith(3, 'response', null);
		expect(onReviewed).toHaveBeenCalled();
	});

	it('validates the amount and does not submit when it is invalid', () => {
		const patchFile = jest.fn();

		const { result } = renderHook(() =>
			useModuleAdminReview({ open: true, module: moduleFixture, files: [], patchFile })
		);

		act(() => {
			result.current.changeAmountValue('0');
		});
		act(() => {
			result.current.confirmAmountAndSubmit();
		});

		expect(result.current.amountError).toBe('Ingresá un monto válido mayor a 0.');
		expect(submitModuleReviewAction).not.toHaveBeenCalled();
	});

	it('submits with a valid amount, closes the dialog and notifies the parent', async () => {
		(deriveModuleStatusFromFiles as jest.Mock).mockReturnValue('approved');
		const patchFile = jest.fn();
		const onReviewed = jest.fn();

		const { result } = renderHook(() =>
			useModuleAdminReview({
				open: true,
				module: moduleFixture,
				files: [],
				patchFile,
				onReviewed,
			})
		);

		act(() => {
			result.current.handleSendResponseClick();
		});
		expect(result.current.amountModalOpen).toBe(true);

		act(() => {
			result.current.setModuleReviewText('approved');
			result.current.changeAmountValue('123.45');
		});
		await act(async () => {
			await result.current.confirmAmountAndSubmit();
		});

		expect(submitModuleReviewAction).toHaveBeenCalledWith(3, 'approved', 123.45);
		expect(result.current.amountModalOpen).toBe(false);
		expect(onReviewed).toHaveBeenCalled();
	});

	it('keeps the amount dialog open when the submission fails', async () => {
		(deriveModuleStatusFromFiles as jest.Mock).mockReturnValue('approved');
		(submitModuleReviewAction as jest.Mock).mockResolvedValue({ success: false, error: 'boom' });
		const patchFile = jest.fn();
		const onReviewed = jest.fn();

		const { result } = renderHook(() =>
			useModuleAdminReview({
				open: true,
				module: moduleFixture,
				files: [],
				patchFile,
				onReviewed,
			})
		);

		act(() => {
			result.current.handleSendResponseClick();
		});
		act(() => {
			result.current.changeAmountValue('100');
		});
		await act(async () => {
			await result.current.confirmAmountAndSubmit();
		});

		expect(result.current.amountModalOpen).toBe(true);
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({ variant: 'destructive', title: 'Error al enviar la respuesta' })
		);
		expect(onReviewed).not.toHaveBeenCalled();
	});

	it('exposes whether all files have already been reviewed', () => {
		const patchFile = jest.fn();

		const { result, rerender } = renderHook(
			({ files }) => useModuleAdminReview({ open: true, module: moduleFixture, files, patchFile }),
			{
				initialProps: { files: [fileFixture, { ...fileFixture, id: 2, status: null }] },
			}
		);
		expect(result.current.allFilesReviewed).toBe(false);

		rerender({
			files: [
				{ ...fileFixture, status: 'approved' },
				{ ...fileFixture, id: 2, status: 'approved' },
			],
		});
		expect(result.current.allFilesReviewed).toBe(true);
	});
});
