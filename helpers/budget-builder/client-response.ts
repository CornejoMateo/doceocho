import type { ClientResponse } from '@/lib/budget-builder/types';

export const MAX_CLIENT_COMMENT_LENGTH = 1000;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isBudgetToken(value: string): boolean {
	return UUID_REGEX.test(value);
}

/** Checks what the client's page sent. Never trust the browser: only these two answers exist. */
export function parseClientResponse(
	body: unknown
): { decision: ClientResponse; comment: string | null } | { error: string } {
	const { decision, comment } = (body ?? {}) as { decision?: unknown; comment?: unknown };

	if (decision !== 'aprobado' && decision !== 'rechazado') {
		return { error: 'Respuesta inválida' };
	}

	const text = typeof comment === 'string' ? comment.trim() : '';

	if (text.length > MAX_CLIENT_COMMENT_LENGTH) {
		return { error: 'El comentario es demasiado largo' };
	}

	return { decision, comment: text || null };
}
