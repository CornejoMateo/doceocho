import { fetchAllPages, fetchByIdsInChunks } from '@/lib/suppliers/pagination';

describe('fetchAllPages', () => {
	it('returns a single page when it is shorter than the page size', async () => {
		const buildQuery = jest.fn().mockResolvedValue({ data: [1, 2, 3], error: null });

		const { data, error } = await fetchAllPages(buildQuery);

		expect(error).toBeNull();
		expect(data).toEqual([1, 2, 3]);
		expect(buildQuery).toHaveBeenCalledTimes(1);
		expect(buildQuery).toHaveBeenCalledWith(0, 999);
	});

	it('fetches a second page when the first page is exactly the page size', async () => {
		const fullPage = Array.from({ length: 1000 }, (_, i) => i);
		const shortPage = [1000, 1001];
		const buildQuery = jest
			.fn()
			.mockResolvedValueOnce({ data: fullPage, error: null })
			.mockResolvedValueOnce({ data: shortPage, error: null });

		const { data, error } = await fetchAllPages(buildQuery);

		expect(error).toBeNull();
		expect(data).toHaveLength(1002);
		expect(buildQuery).toHaveBeenCalledTimes(2);
		expect(buildQuery).toHaveBeenNthCalledWith(1, 0, 999);
		expect(buildQuery).toHaveBeenNthCalledWith(2, 1000, 1999);
	});

	it('stops at a short last page after multiple full pages', async () => {
		const fullPage = (start: number) => Array.from({ length: 1000 }, (_, i) => start + i);
		const buildQuery = jest
			.fn()
			.mockResolvedValueOnce({ data: fullPage(0), error: null })
			.mockResolvedValueOnce({ data: fullPage(1000), error: null })
			.mockResolvedValueOnce({ data: [2000], error: null });

		const { data } = await fetchAllPages(buildQuery);

		expect(data).toHaveLength(2001);
		expect(buildQuery).toHaveBeenCalledTimes(3);
	});

	it('stops and returns the error when a page fails mid-way', async () => {
		const fullPage = Array.from({ length: 1000 }, (_, i) => i);
		const buildQuery = jest
			.fn()
			.mockResolvedValueOnce({ data: fullPage, error: null })
			.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });

		const { data, error } = await fetchAllPages(buildQuery);

		expect(data).toBeNull();
		expect(error).toEqual({ message: 'boom' });
		expect(buildQuery).toHaveBeenCalledTimes(2);
	});

	it('treats a null data page as empty and stops', async () => {
		const buildQuery = jest.fn().mockResolvedValue({ data: null, error: null });

		const { data, error } = await fetchAllPages(buildQuery);

		expect(error).toBeNull();
		expect(data).toEqual([]);
		expect(buildQuery).toHaveBeenCalledTimes(1);
	});
});

describe('fetchByIdsInChunks', () => {
	it('returns an empty result without calling fetchChunk for no ids', async () => {
		const fetchChunk = jest.fn();

		const { data, error } = await fetchByIdsInChunks([], fetchChunk);

		expect(error).toBeNull();
		expect(data).toEqual([]);
		expect(fetchChunk).not.toHaveBeenCalled();
	});

	it('fetches ids in chunks of 200 and merges the results', async () => {
		const ids = Array.from({ length: 250 }, (_, i) => i + 1);
		const fetchChunk = jest
			.fn()
			.mockResolvedValueOnce({ data: ['a'], error: null })
			.mockResolvedValueOnce({ data: ['b'], error: null });

		const { data, error } = await fetchByIdsInChunks(ids, fetchChunk);

		expect(error).toBeNull();
		expect(data).toEqual(['a', 'b']);
		expect(fetchChunk).toHaveBeenCalledTimes(2);
		expect(fetchChunk).toHaveBeenNthCalledWith(1, ids.slice(0, 200));
		expect(fetchChunk).toHaveBeenNthCalledWith(2, ids.slice(200));
	});

	it('does not merge a chunk below 200 ids into more than one call', async () => {
		const ids = [1, 2, 3];
		const fetchChunk = jest.fn().mockResolvedValue({ data: ['x'], error: null });

		await fetchByIdsInChunks(ids, fetchChunk);

		expect(fetchChunk).toHaveBeenCalledTimes(1);
		expect(fetchChunk).toHaveBeenCalledWith(ids);
	});

	it('stops and returns the error when a chunk fails', async () => {
		const ids = Array.from({ length: 250 }, (_, i) => i + 1);
		const fetchChunk = jest
			.fn()
			.mockResolvedValueOnce({ data: ['a'], error: null })
			.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });

		const { data, error } = await fetchByIdsInChunks(ids, fetchChunk);

		expect(data).toBeNull();
		expect(error).toEqual({ message: 'boom' });
		expect(fetchChunk).toHaveBeenCalledTimes(2);
	});
});
