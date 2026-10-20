import type { ClientBudget } from '@/helpers/budget-builder/share';
import type { ClientResponse } from '@/lib/budget-builder/types';

/** Browser side of the client's link: no session, only the public API routes. */

export type RecordedResponse = {
	decision: ClientResponse;
	comment: string | null;
	respondedAt: string | null;
};

async function readError(response: Response, fallback: string) {
	try {
		return (await response.json())?.error || fallback;
	} catch {
		return fallback;
	}
}

export async function fetchPublicBudget(token: string): Promise<{
	data: { budget: ClientBudget; response: RecordedResponse | null } | null;
	error: string | null;
}> {
	try {
		const response = await fetch(`/api/budget-builder/${token}`);
		if (!response.ok) {
			return { data: null, error: await readError(response, 'No encontramos este presupuesto') };
		}
		return { data: await response.json(), error: null };
	} catch {
		return { data: null, error: 'No pudimos cargar el presupuesto' };
	}
}

export async function respondToBudget(
	token: string,
	decision: ClientResponse,
	comment: string
): Promise<{ data: RecordedResponse | null; error: string | null }> {
	try {
		const response = await fetch(`/api/budget-builder/${token}/respond`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ decision, comment }),
		});
		if (!response.ok) {
			return { data: null, error: await readError(response, 'No pudimos guardar tu respuesta') };
		}
		return { data: (await response.json()).response, error: null };
	} catch {
		return { data: null, error: 'No pudimos guardar tu respuesta' };
	}
}
