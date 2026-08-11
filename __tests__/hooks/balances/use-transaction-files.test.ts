import { renderHook, act, waitFor } from '@testing-library/react';
import { useTransactionFiles } from '@/hooks/balances/use-transaction-files';
import {
	deleteClientFile,
	getClientFilesByTransaction,
	uploadClientFile,
} from '@/lib/clients/files';
import { optimizeFile } from '@/utils/optimization-images';

jest.mock('@/lib/clients/files', () => ({
	deleteClientFile: jest.fn(),
	getClientFilesByTransaction: jest.fn(),
	uploadClientFile: jest.fn(),
}));

jest.mock('@/utils/optimization-images', () => ({
	optimizeFile: jest.fn((f) => Promise.resolve(f)),
}));

jest.mock('@/components/ui/use-toast', () => ({
	useToast: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => `translated: ${e?.message || e}`,
}));

const mockBalance = { id: 1, client_id: 5 } as any;

describe('useTransactionFiles', () => {
	let mockToast: jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();
		mockToast = jest.fn();
		(jest.requireMock('@/components/ui/use-toast').useToast as jest.Mock).mockReturnValue({
			toast: mockToast,
		});
	});

	it('starts with default state', () => {
		const { result } = renderHook(() => useTransactionFiles(mockBalance));

		expect(result.current.transactionForFiles).toBeNull();
		expect(result.current.transactionFiles).toEqual([]);
		expect(result.current.isLoadingFiles).toBe(false);
		expect(result.current.isUploadingFiles).toBe(false);
	});

	it('sets transaction and loads files when viewing files', async () => {
		const files = [{ id: 1, name: 'doc.pdf', url: 'blob:test', path: 'client/5/doc.pdf' }];
		(getClientFilesByTransaction as jest.Mock).mockResolvedValue({ data: files, error: null });

		jest.spyOn(require('@/lib/supabase-client'), 'getSupabaseClient').mockReturnValue({
			storage: {
				from: jest.fn().mockReturnValue({
					download: jest.fn().mockResolvedValue({ data: new Blob(['test']), error: null }),
				}),
			},
		});

		const transaction = { id: 10, date: '2024-06-15' } as any;
		const { result } = renderHook(() => useTransactionFiles(mockBalance));

		act(() => {
			result.current.handleViewTransactionFiles(transaction);
		});

		expect(result.current.transactionForFiles).toEqual(transaction);

		await waitFor(() => {
			expect(result.current.isLoadingFiles).toBe(false);
		});
	});

	it('uploads files for a transaction', async () => {
		(uploadClientFile as jest.Mock).mockResolvedValue({ error: null });
		(optimizeFile as jest.Mock).mockResolvedValue(new File([''], 'test.pdf'));

		const { result } = renderHook(() => useTransactionFiles(mockBalance));

		await act(async () => {
			await result.current.uploadFilesForTransaction(1, [new File([''], 'test.pdf')]);
		});

		expect(uploadClientFile).toHaveBeenCalled();
	});

	it('does not upload if balance has no client_id', async () => {
		const balanceNoClient = { id: 1 } as any;
		const { result } = renderHook(() => useTransactionFiles(balanceNoClient));

		await act(async () => {
			await result.current.uploadFilesForTransaction(1, [new File([''], 'test.pdf')]);
		});

		expect(uploadClientFile).not.toHaveBeenCalled();
		expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
	});

	it('shows error toast when upload fails', async () => {
		(uploadClientFile as jest.Mock).mockResolvedValue({ error: new Error('Upload failed') });
		(optimizeFile as jest.Mock).mockResolvedValue(new File([''], 'test.pdf'));

		const { result } = renderHook(() => useTransactionFiles(mockBalance));

		await act(async () => {
			await result.current.uploadFilesForTransaction(1, [new File([''], 'test.pdf')]);
		});

		expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
	});

	it('deletes a transaction file and reloads', async () => {
		(deleteClientFile as jest.Mock).mockResolvedValue({ success: true, error: null });
		(getClientFilesByTransaction as jest.Mock).mockResolvedValue({ data: [], error: null });

		jest.spyOn(require('@/lib/supabase-client'), 'getSupabaseClient').mockReturnValue({
			storage: {
				from: jest.fn().mockReturnValue({
					download: jest.fn().mockResolvedValue({ data: new Blob(['']), error: null }),
				}),
			},
		});

		const { result } = renderHook(() => useTransactionFiles(mockBalance));

		act(() => {
			result.current.setTransactionForFiles({ id: 10 } as any);
		});

		await act(async () => {
			await result.current.handleDeleteTransactionFile(5);
		});

		expect(deleteClientFile).toHaveBeenCalledWith(5);
	});

	it('handles delete error gracefully', async () => {
		(deleteClientFile as jest.Mock).mockResolvedValue({
			success: false,
			error: new Error('Delete error'),
		});

		const { result } = renderHook(() => useTransactionFiles(mockBalance));

		await act(async () => {
			await result.current.handleDeleteTransactionFile(5);
		});

		expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
	});

	it('closes gallery and resets state', async () => {
		const { result } = renderHook(() => useTransactionFiles(mockBalance));

		act(() => {
			result.current.setTransactionForFiles({ id: 1 } as any);
		});

		expect(result.current.transactionForFiles).toEqual({ id: 1 });

		act(() => {
			result.current.handleCloseGallery();
		});

		expect(result.current.transactionForFiles).toBeNull();
		expect(result.current.transactionFiles).toEqual([]);
	});

	it('uploads files from gallery', async () => {
		(uploadClientFile as jest.Mock).mockResolvedValue({ error: null });
		(optimizeFile as jest.Mock).mockResolvedValue(new File([''], 'test.pdf'));
		(getClientFilesByTransaction as jest.Mock).mockResolvedValue({ data: [], error: null });

		jest.spyOn(require('@/lib/supabase-client'), 'getSupabaseClient').mockReturnValue({
			storage: {
				from: jest.fn().mockReturnValue({
					download: jest.fn().mockResolvedValue({ data: new Blob(['']), error: null }),
				}),
			},
		});

		const { result } = renderHook(() => useTransactionFiles(mockBalance));

		act(() => {
			result.current.setTransactionForFiles({ id: 10 } as any);
		});

		await act(async () => {
			await result.current.handleUploadFilesFromGallery(5, [new File([''], 'photo.jpg')]);
		});

		expect(uploadClientFile).toHaveBeenCalledWith(5, expect.any(File), { transactionId: 10 });
	});
});
