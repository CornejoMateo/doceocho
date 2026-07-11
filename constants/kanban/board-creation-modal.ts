export const BOARD_COLORS = [
	'#4F5C4D', // Default green
	'#3B82F6', // Blue
	'#EF4444', // Red
	'#F59E0B', // Orange
	'#8B5CF6', // Purple
	'#EC4899', // Pink
	'#10B981', // Emerald
	'#6366F1', // Indigo
] as const;

export type BoardColor = (typeof BOARD_COLORS)[number];
