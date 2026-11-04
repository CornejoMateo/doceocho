'use client';

import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { ClientTab } from '@/constants/clients/client-tabs';
import { getClientHref } from '@/helpers/clients/client-href';
import { useCanView } from '@/hooks/permissions/use-can-view';

interface ClientLinkProps {
	clientId: number | null | undefined;
	/** Tab to open the client on, e.g. their balances when coming from a balance. */
	tab?: ClientTab;
	children: ReactNode;
	className?: string;
}

/**
 * A client's name that opens their detail in one click.
 * Without a client or without access to clients it stays plain text.
 */
export function ClientLink({ clientId, tab, children, className }: ClientLinkProps) {
	const canView = useCanView();

	if (!clientId || !canView('clients')) {
		return <span className={className}>{children}</span>;
	}

	return (
		<Link
			href={getClientHref(clientId, tab)}
			title="Ver cliente"
			// Lists often open something on row click; the link must win over it.
			onClick={(event: MouseEvent) => event.stopPropagation()}
			className={cn(
				// Same dotted underline as other in-place links (e.g. work cards), so it reads as clickable.
				'underline decoration-dotted decoration-muted-foreground/50 underline-offset-2 hover:text-primary hover:decoration-solid focus-visible:decoration-solid focus-visible:outline-none',
				className
			)}
		>
			{children}
		</Link>
	);
}
