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
	/** Client the card is about, when it has one. */
	client_id: number | null;
	/** Work the card is about. Always belongs to `client_id` when both are set. */
	work_id: number | null;
}

/** Names of the linked records, read alongside the card so the board can show them. */
export interface CardClient {
	id: number;
	name: string | null;
	last_name: string | null;
}

export interface CardWork {
	id: number;
	name: string | null;
	locality: string | null;
	address: string | null;
}

export interface CardWithLinks extends Card {
	client?: CardClient | null;
	work?: CardWork | null;
}

export interface CardWithRelations extends CardWithLinks {
	list?: List;
	files?: KanbanFileRecord[];
}

export interface CardFormData {
	title: string;
	description?: string;
	due_date?: string;
	priority?: 'none' | 'low' | 'medium' | 'high' | 'very_high';
	color?: string;
	client_id?: number | null;
	work_id?: number | null;
}

export type KanbanFileRecord = {
	id: number;
	uploaded_at: string;
	path: string | null;
	kanban_card_id: number | null;
	displayName: string | null;
};
