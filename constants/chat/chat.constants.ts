import { formatCreatedAt } from '@/utils/format-date';

export const CHAT_CONSTANTS = {
	MESSAGES: {
		LOADING_CHANNELS: 'Cargando canales...',
		NO_CHANNELS: 'No tienes canales',
		NO_MESSAGES: 'No hay mensajes en este canal',
		NO_SEARCH_RESULTS: (term: string) => `No se encontraron mensajes que coincidan con "${term}"`,
		SELECT_CHANNEL: 'Selecciona un canal para comenzar a chatear',
		INPUT_PLACEHOLDER: 'Escribe un mensaje...',
		SEARCH_PLACEHOLDER: 'Buscar mensajes...',
		MESSAGE_DELETED: 'Este mensaje fue eliminado',
		EDITED: '(editado)',
		SEARCH_RESULTS: (count: number) =>
			count === 1 ? 'mensaje encontrado' : 'mensajes encontrados',
	},
	CHANNELS: {
		TITLE: 'Canales',
		NEW_CHANNEL: 'Nuevo',
		NO_NAME: 'Sin nombre',
	},
	PUSH_NOTIFICATIONS: {
		ENABLE: 'Habilitar notificaciones',
		ENABLED: 'Notificaciones activadas',
		SUBSCRIBE: 'Recibir notificaciones',
		UNSUBSCRIBE: 'Desactivar notificaciones',
		BLOCKED: 'Notificaciones bloqueadas',
		NOT_SUPPORTED:
			'No disponible en este navegador. Instalá la app desde el menú Compartir > Agregar a Inicio.',
	},
	DIALOGS: {
		CREATE_CHANNEL: {
			TITLE: 'Crear nuevo canal',
		},
		CLEANUP_MESSAGES: {
			TITLE: 'Limpiar mensajes del canal',
			DESCRIPTION:
				'Selecciona una fecha. Se eliminarán todos los mensajes anteriores a esa fecha. Esta acción no se puede deshacer.',
			CANCEL: 'Cancelar',
			CONFIRM: 'Limpiar mensajes',
		},
		MEMBERS: {
			TITLE: 'Miembros del canal',
		},
	},
	CONFIRMATIONS: {
		DELETE_MESSAGE: '¿Estás seguro de que quieres eliminar este mensaje?',
		DELETE_CHANNEL: (name: string) =>
			`¿Estás seguro de que quieres eliminar el canal "${name}"? Esta acción eliminará todos los mensajes y miembros del canal.`,
		CLEANUP_MESSAGES: (date: string) =>
			`¿Estás seguro de que quieres eliminar todos los mensajes anteriores a ${formatCreatedAt(new Date(date))}? Esta acción no se puede deshacer.`,
	},
	ALERTS: {
		CHANNEL_DELETED: (count: number) => `Se eliminaron ${count || 0} mensajes del canal.`,
		ERROR_DELETE_CHANNEL: 'Error al eliminar el canal',
		ERROR_CLEANUP_MESSAGES: 'Error al limpiar mensajes del canal',
	},
	BUTTONS: {
		SAVE: 'Guardar',
		CANCEL: 'Cancelar',
		MEMBERS: 'Miembros',
		CLEAN: 'Limpiar',
	},
	MENU: {
		SEARCH_BY_WORD: 'Buscar por palabra',
		SEARCH_BY_DATE: 'Buscar por día',
		MANAGE_MEMBERS: 'Gestionar miembros',
		CLEAN_MESSAGES: 'Limpiar mensajes',
	},
} as const;

export const MAX_UNREAD_DISPLAY = 99;
