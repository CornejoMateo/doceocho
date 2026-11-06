import { renderHook, act, waitFor } from '@testing-library/react';
import { useChannelFiles } from '@/hooks/chat/use-channel-files';

const mockToast = jest.fn();

jest.mock('@/components/ui/use-toast', () => ({
	useToast: () => ({ toast: mockToast }),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => e?.message || String(e),
}));

jest.mock('@/lib/chat/channel-files', () => ({
	listChannelFiles: jest.fn(),
	uploadChannelFile: jest.fn(),
	deleteChannelFile: jest.fn(),
	getChannelFileSignedUrl: jest.fn(),
}));

import { listChannelFiles } from '@/lib/chat/channel-files';

function page(files: any[], nextCursor: any = null, hasMore = false) {
	return { data: { files, nextCursor, hasMore }, error: null };
}

describe('useChannelFiles', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('does not fetch files until ensureLoaded is called', () => {
		renderHook(() => useChannelFiles(1, 'user-1'));

		expect(listChannelFiles).not.toHaveBeenCalled();
	});

	it('loads the first page when ensureLoaded is called for a channel', async () => {
		const files = [{ id: 1, file_name: 'a.png' }];
		(listChannelFiles as jest.Mock).mockResolvedValue(page(files));
		const { result } = renderHook(() => useChannelFiles(1, 'user-1'));

		act(() => {
			result.current.ensureLoaded(1);
		});

		await waitFor(() => {
			expect(result.current.files).toEqual(files);
		});
		expect(listChannelFiles).toHaveBeenCalledWith(1, null);
	});

	it('leaves the channel unloaded after a failed load so a retry refetches it', async () => {
		(listChannelFiles as jest.Mock).mockResolvedValue({ data: null, error: new Error('boom') });
		const { result } = renderHook(() => useChannelFiles(1, 'user-1'));

		await act(async () => {
			result.current.ensureLoaded(1);
		});
		await waitFor(() => expect(result.current.error).toBe('boom'));

		(listChannelFiles as jest.Mock).mockResolvedValue(page([{ id: 1 }]));
		act(() => {
			result.current.ensureLoaded(1);
		});

		await waitFor(() => expect(listChannelFiles).toHaveBeenCalledTimes(2));
	});

	it('ignores a stale response from a request started before a newer one', async () => {
		let resolveFirst: (value: any) => void = () => {};
		(listChannelFiles as jest.Mock)
			.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						resolveFirst = resolve;
					})
			)
			.mockResolvedValueOnce(page([{ id: 2, file_name: 'second.png' }]));

		const { result } = renderHook(() => useChannelFiles(1, 'user-1'));

		act(() => {
			result.current.ensureLoaded(1);
		});
		act(() => {
			result.current.ensureLoaded(2);
		});

		await waitFor(() => {
			expect(result.current.files).toEqual([{ id: 2, file_name: 'second.png' }]);
		});

		await act(async () => {
			resolveFirst(page([{ id: 1, file_name: 'first.png' }]));
		});

		expect(result.current.files).toEqual([{ id: 2, file_name: 'second.png' }]);
	});

	it('appends the next page and advances the cursor on loadMore', async () => {
		(listChannelFiles as jest.Mock)
			.mockResolvedValueOnce(page([{ id: 1 }], { createdAt: '2024-01-01', id: 1 }, true))
			.mockResolvedValueOnce(page([{ id: 2 }], null, false));
		const { result } = renderHook(() => useChannelFiles(1, 'user-1'));

		await act(async () => {
			result.current.ensureLoaded(1);
		});
		await waitFor(() => expect(result.current.hasMore).toBe(true));

		await act(async () => {
			result.current.loadMore();
		});

		expect(listChannelFiles).toHaveBeenLastCalledWith(1, { createdAt: '2024-01-01', id: 1 });
		expect(result.current.files).toEqual([{ id: 1 }, { id: 2 }]);
		expect(result.current.hasMore).toBe(false);
	});
});
