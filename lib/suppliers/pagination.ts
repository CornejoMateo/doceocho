const PAGE_SIZE = 1000;
const ID_CHUNK_SIZE = 200;

type PageResult<T> = { data: T[] | null; error: any };

/**
 * Fetches all rows across range()-paginated blocks of PostgREST's max page size,
 * stopping as soon as a short page signals the end.
 */
export async function fetchAllPages<T>(
	buildQuery: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<PageResult<T>> {
	const all: T[] = [];
	let offset = 0;

	while (true) {
		const { data, error } = await buildQuery(offset, offset + PAGE_SIZE - 1);
		if (error) {
			return { data: null, error };
		}

		const page = data ?? [];
		all.push(...page);

		if (page.length < PAGE_SIZE) break;
		offset += PAGE_SIZE;
	}

	return { data: all, error: null };
}

/**
 * Splits large id lists into ~200-id chunks to avoid PostgREST .in() URL-length limits.
 */
export async function fetchByIdsInChunks<T>(
	ids: number[],
	fetchChunk: (chunkIds: number[]) => Promise<PageResult<T>>
): Promise<PageResult<T>> {
	if (ids.length === 0) {
		return { data: [], error: null };
	}

	const all: T[] = [];

	for (let i = 0; i < ids.length; i += ID_CHUNK_SIZE) {
		const chunk = ids.slice(i, i + ID_CHUNK_SIZE);
		const { data, error } = await fetchChunk(chunk);
		if (error) {
			return { data: null, error };
		}
		all.push(...(data ?? []));
	}

	return { data: all, error: null };
}
