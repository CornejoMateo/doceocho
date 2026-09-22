'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface AttentionTileProps {
	icon: LucideIcon;
	count: number;
	/** Shown when count is 1. */
	singular: string;
	/** Shown when count is 0 or more than 1. */
	plural: string;
	href: string;
	/** Tailwind text colour class for the icon and the number. */
	tone: string;
}

/** One thing waiting for a decision, and one click to go resolve it. */
export function AttentionTile({
	icon: Icon,
	count,
	singular,
	plural,
	href,
	tone,
}: AttentionTileProps) {
	return (
		<Link href={href} className="group block">
			<Card className="p-4 transition-colors hover:border-primary/50">
				<div className="flex items-center gap-3">
					<div className={`rounded-lg bg-secondary p-2.5 ${tone}`}>
						<Icon className="h-5 w-5" />
					</div>
					<div className="min-w-0 flex-1">
						<p className={`text-2xl font-bold leading-none ${tone}`}>{count}</p>
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
