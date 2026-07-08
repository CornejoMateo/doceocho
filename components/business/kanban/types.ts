export interface Board {
	id: number;
	name: string;
	description: string | null;
	color: string;
	due_date_tolerance_yellow: number; // Days before due date to show yellow warning
	due_date_tolerance_red: number; // Days before due date to show red warning
}

export interface BoardWithMembers extends Board {
	members: BoardMember[];
	lists?: List[];
}

export interface BoardFormData {
	name: string;
	description?: string;
	color?: string;
}

export interface BoardMember {
	id: number;
	created_at: string;
	board_id: number;
	user_id: string; // UUID
}

export interface List {
	id: number;
	created_at: string;
	board_id: number;
	name: string;
	cards?: Card[];
}

export interface ListFormData {
	name: string;
}

export interface ListWithCards extends List {
	cards: Card[];
}
export interface Card {
	id: number;
	created_at: string;
	list_id: number;
	title: string;
	description: string | null;
	position: number;
	due_date: string | null;
	priority: 'none' | 'low' | 'medium' | 'high' | 'very_high';
	completed_at: string | null;
	color: string | null;
}

export interface CardWithRelations extends Card {
	list?: List;
	files?: KanbanFileRecord[];
}

export interface CardFormData {
	title: string;
	description?: string;
	due_date?: string;
	priority?: 'none' | 'low' | 'medium' | 'high' | 'very_high';
	color?: string;
}

export type KanbanFileRecord = {
	id: number;
	uploaded_at: string;
	path: string | null;
	kanban_card_id: number | null;
	displayName: string | null;
};
