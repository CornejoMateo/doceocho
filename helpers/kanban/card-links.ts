import type { CardClient, CardWork } from '@/components/business/kanban/types';

/** Display name of the client a card is linked to, or null when it has none. */
export function formatCardClientName(client: CardClient | null | undefined): string | null {
	if (!client) return null;

	const name = [client.last_name, client.name].filter(Boolean).join(' ').trim();

	return name || 'Cliente sin nombre';
}

/**
 * Display name of the linked work. Works often have no name, so it falls back
 * to the location, which is how the rest of the system labels them.
 */
export function formatCardWorkName(work: CardWork | null | undefined): string | null {
	if (!work) return null;

	if (work.name?.trim()) return work.name.trim();

	const location = [work.locality, work.address].filter(Boolean).join(' · ').trim();

	return location || 'Obra sin nombre';
}
