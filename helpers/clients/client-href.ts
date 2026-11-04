import type { ClientTab } from '@/constants/clients/client-tabs';

/** Opens the client's detail on the clients page, optionally on a given tab. */
export function getClientHref(clientId: number, tab?: ClientTab): string {
	const params = new URLSearchParams({ clientId: String(clientId) });
	if (tab) params.set('tab', tab);

	return `/clients?${params.toString()}`;
}
