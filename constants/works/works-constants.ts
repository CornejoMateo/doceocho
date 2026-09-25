import { StickyNote, Edit3, AlertTriangle } from 'lucide-react';

export const POST_IT_CONSTANTS = {
	// Colors
	COLORS: {
		YELLOW: 'bg-yellow-100 border-yellow-300 text-yellow-900',
		PINK: 'bg-pink-100 border-pink-300 text-pink-900',
		BLUE: 'bg-blue-100 border-blue-300 text-blue-900',
		GREEN: 'bg-green-100 border-green-300 text-green-900',
	},

	// Default configuration
	DEFAULT_COLOR: 'YELLOW',
	MAX_LENGTH: 500,

	// Texts
	LABELS: {
		ADD_NOTE: 'Agregar nota general',
		EDIT_NOTE: 'Editar nota general',
		NOTE_PLACEHOLDER:
			'Escribe aquí una nota general sobre la obra (impedimentos, estados especiales, etc.)...',
		GENERAL_NOTE: 'Nota general',
		HAS_GENERAL_NOTE: 'Tiene nota general',
		SAVE: 'Guardar nota',
		CANCEL: 'Cancelar',
		EDIT: 'Editar',
		DELETE: 'Eliminar',
		CONFIRM_DELETE: '¿Estás seguro de que quieres eliminar esta nota?',
	},

	// Icons
	ICONS: {
		STICKY_NOTE: StickyNote,
		EDIT: Edit3,
		ALERT: AlertTriangle,
	},

	// Breakpoints for responsive
	BREAKPOINTS: {
		MOBILE: '768px', // md breakpoint
	},

	// CSS classes
	CLASSES: {
		POST_IT_CONTAINER:
			'relative p-4 rounded-lg border-2 shadow-sm transition-all duration-200 hover:shadow-md',
		POST_IT_MOBILE: 'p-3 rounded-lg border shadow-sm',
		BADGE: 'gap-1 justify-center',
		MODAL_OVERLAY: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4',
		MODAL_CONTENT: 'bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto',
		TEXTAREA:
			'w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
	},
} as const;

export type PostItColor = keyof typeof POST_IT_CONSTANTS.COLORS;

export type SortKey =
	| 'name'
	| 'client'
	| 'locality'
	| 'hood'
	| 'zone'
	| 'architect'
	| 'status'
	| 'progress'
	| 'created'
	| 'completed'
	| 'duration';

export const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
	{ key: 'name', label: 'Nombre' },
	{ key: 'client', label: 'Cliente' },
	{ key: 'locality', label: 'Localidad' },
	{ key: 'hood', label: 'Barrio' },
	{ key: 'zone', label: 'Zona' },
	{ key: 'architect', label: 'Arquitecto' },
	{ key: 'status', label: 'Estado' },
	{ key: 'progress', label: 'Avance', numeric: true },
	{ key: 'created', label: 'Creada' },
	{ key: 'completed', label: 'Finalizada' },
	{ key: 'duration', label: 'Duración', numeric: true },
];
