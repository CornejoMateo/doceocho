'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AttentionTileProps {
	icon: LucideIcon;
	count: number;
	/** Shown when count is 1. */
	singular: string;
	/** Shown when count is 0 or more than 1. */
	plural: string;
	href: string;
	/** Tailwind text colour class used only when there is something pending. */
	tone: string;
}

/**
 * One thing waiting for a decision, and one click to go resolve it.
 * A tile with nothing pending stays visible but quiet: hiding it would mean
 * nobody can tell whether the panel watches that module at all.
 */
export function AttentionTile({
	icon: Icon,
	count,
	singular,
	plural,
	href,
	tone,
}: AttentionTileProps) {
	const isPending = count > 0;

	return (
		<Link href={href} className="group block">
			<Card
				className={cn('p-4 transition-colors hover:border-primary/50', !isPending && 'bg-muted/30')}
			>
				<div className="flex items-center gap-3">
					<div
						className={cn(
							'rounded-lg p-2.5',
							isPending ? `bg-secondary ${tone}` : 'bg-muted text-muted-foreground/60'
						)}
					>
						<Icon className="h-5 w-5" />
					</div>
					<div className="min-w-0 flex-1">
						<p
							className={cn(
								'text-2xl font-bold leading-none',
								isPending ? tone : 'text-muted-foreground/60'
							)}
						>
							{count}
						</p>
						<p className="mt-1 truncate text-xs text-muted-foreground">
							{count === 1 ? singular : plural}
						</p>
					</div>
					<ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
				</div>
			</Card>
		</Link>
	);
}
