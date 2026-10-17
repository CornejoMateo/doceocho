import type { LucideIcon } from 'lucide-react';
import type { UserRole } from '@/constants/users/user-role';

export type SearchResult = {
	/** Unique across providers, built as `${providerId}:${entityId}`. */
	id: string;
	title: string;
	subtitle?: string;
	icon: LucideIcon;
	/** Where selecting the result takes the user. */
	href: string;
	/** Extra text the result can be matched by, beyond title and subtitle. */
	keywords?: string[];
};

/**
 * A searchable domain. Each provider owns its own query and its own
 * permissions, so adding a domain to the palette never touches the others.
 */
export type SearchProvider = {
	id: string;
	/** Group heading shown above its results. */
	label: string;
	/** Roles allowed to see this group; every other role never queries it. */
	roles: UserRole[];
	/** Lower comes first in the palette. */
	order: number;
	search: (term: string, signal: AbortSignal) => Promise<SearchResult[]>;
};

export type SearchGroup = {
	providerId: string;
	label: string;
	results: SearchResult[];
};
