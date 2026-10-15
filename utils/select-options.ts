// Keeps a saved-but-now-inactive option visible in a Select while editing, without listing it on create.
export function withInactiveSelected<T extends { id: number; is_active: boolean }>(
	activeOptions: T[],
	allOptions: T[],
	selectedId: string,
	isEditing: boolean
): T[] {
	if (!isEditing || !selectedId) return activeOptions;
	if (activeOptions.some((option) => String(option.id) === selectedId)) return activeOptions;
	const inactive = allOptions.find((option) => String(option.id) === selectedId);
	return inactive ? [...activeOptions, inactive] : activeOptions;
}
