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
	updated_at: string;
	board_id: number;
	name: string;
	position: number;
	is_archived: boolean;
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
	updated_at: string;
	list_id: number;
	title: string;
	description: string | null;
	position: number;
	is_archived: boolean;
	due_date: string | null;
	start_date: string | null;
	reminder_date: string | null;
	priority: 'none' | 'low' | 'medium' | 'high' | 'very_high';
	completed_at: string | null;
	cover_image_url: string | null;
	color: string | null;
}

export interface CardWithRelations extends Card {
	list?: List;
	labels?: Label[];
	members?: CardMember[];
	attachments?: Attachment[];
	crm_links?: CardCrmLink[];
	custom_field_values?: CustomFieldValue[];
}

export interface CardFormData {
	title: string;
	description?: string;
	due_date?: string;
	start_date?: string;
	reminder_date?: string;
	priority?: 'none' | 'low' | 'medium' | 'high' | 'very_high';
	color?: string;
}

// ============================================
// LABEL TYPES
// ============================================
export interface Label {
	id: number;
	created_at: string;
	board_id: number;
	name: string;
	color: string;
}

export interface LabelFormData {
	name: string;
	color: string;
}

// ============================================
// CARD LABEL TYPES
// ============================================
export interface CardLabel {
	id: number;
	created_at: string;
	card_id: number;
	label_id: number;
	label?: Label;
}

// ============================================
// CARD MEMBER TYPES
// ============================================
export interface CardMember {
	id: number;
	created_at: string;
	card_id: number;
	user_id: string; // UUID
	is_observer: boolean;
	user?: {
		id: string; // UUID
		email?: string | null;
	};
}

// ============================================
// ATTACHMENT TYPES
// ============================================
export interface Attachment {
	id: number;
	uploaded_at: string;
	kanban_card_id: number;
	path: string | null;
}

// ============================================
// CRM LINK TYPES
// ============================================
export interface CardCrmLink {
	id: number;
	created_at: string;
	card_id: number;
	link_type: 'client' | 'budget' | 'order' | 'invoice';
	entity_id: number;
}

export interface CardCrmLinkFormData {
	link_type: 'client' | 'budget' | 'order' | 'invoice';
	entity_id: number;
}

// ============================================
// CUSTOM FIELD TYPES
// ============================================
export interface CustomField {
	id: number;
	created_at: string;
	board_id: number;
	name: string;
	field_type: 'text' | 'number' | 'date' | 'select' | 'currency' | 'checkbox';
	options: string[] | null;
	is_required: boolean;
	position: number;
}

export interface CustomFieldFormData {
	name: string;
	field_type: 'text' | 'number' | 'date' | 'select' | 'currency' | 'checkbox';
	options?: string[];
	is_required?: boolean;
}

// ============================================
// CUSTOM FIELD VALUE TYPES
// ============================================
export interface CustomFieldValue {
	id: number;
	created_at: string;
	updated_at: string;
	card_id: number;
	field_id: number;
	value: string | null;
	field?: CustomField;
}

export interface CustomFieldValueFormData {
	value: string;
}

// ============================================
// AUTOMATION RULE TYPES
// ============================================
export interface AutomationRule {
	id: number;
	created_at: string;
	updated_at: string;
	board_id: number;
	name: string;
	is_active: boolean;
	trigger_type:
		| 'card_moved'
		| 'card_created'
		| 'card_updated'
		| 'due_date_approaching'
		| 'due_date_passed';
	trigger_conditions: any;
	actions: any;
	run_count: number;
	last_run_at: string | null;
}

export interface AutomationRuleFormData {
	name: string;
	trigger_type:
		| 'card_moved'
		| 'card_created'
		| 'card_updated'
		| 'due_date_approaching'
		| 'due_date_passed';
	trigger_conditions: any;
	actions: any;
}

// ============================================
// FILTER TYPES
// ============================================
export interface CardFilters {
	search: string;
	labels: number[];
	members: number[];
	priority: ('none' | 'low' | 'medium' | 'high' | 'very_high')[];
	due_date_status: 'all' | 'overdue' | 'due_soon' | 'completed' | 'no_date';
	has_attachments: boolean;
	crm_link_type: 'all' | 'client' | 'budget' | 'order' | 'invoice';
}

// ============================================
// SORT TYPES
// ============================================
export type CardSortField = 'position' | 'created_at' | 'due_date' | 'priority' | 'title';
export type SortDirection = 'asc' | 'desc';

export interface CardSort {
	field: CardSortField;
	direction: SortDirection;
}

// ============================================
// DRAG AND DROP TYPES
// ============================================
export interface DragDropResult {
	draggableId: string;
	type: string;
	source: {
		droppableId: string;
		index: number;
	};
	destination: {
		droppableId: string;
		index: number;
	} | null;
}

// ============================================
// UI STATE TYPES
// ============================================
export interface KanbanBoardState {
	board: BoardWithMembers | null;
	loading: boolean;
	error: string | null;
	filters: CardFilters;
	sort: CardSort;
	searchQuery: string;
	selectedCard: CardWithRelations | null;
	isCardModalOpen: boolean;
	isCreateListOpen: boolean;
	isCreateCardOpen: boolean;
}

export interface KanbanListState {
	list: ListWithCards | null;
	loading: boolean;
	error: string | null;
}

export interface KanbanCardState {
	card: CardWithRelations | null;
	loading: boolean;
	error: string | null;
}
