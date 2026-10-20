/**
 * What changed between two versions of a list, by id: the rows to save and the ids to delete.
 * Lets autosave send only what the user touched instead of the whole catalog.
 */
export function diffById<T extends { id: string }>(
	previous: T[],
	next: T[]
): { upserts: { item: T; position: number }[]; deletes: string[] } {
	const before = new Map(previous.map((item, position) => [item.id, { item, position }]));

	const upserts = next.flatMap((item, position) => {
		const old = before.get(item.id);
		const changed =
			!old || old.position !== position || JSON.stringify(old.item) !== JSON.stringify(item);
		return changed ? [{ item, position }] : [];
	});

	const nextIds = new Set(next.map((item) => item.id));
	const deletes = previous.filter((item) => !nextIds.has(item.id)).map((item) => item.id);

	return { upserts, deletes };
}
