'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KanbanEmptyStateProps {
	icon: LucideIcon;
	title: string;
	/** One or two lines explaining what this is, for someone new to Kanban. */
	description: string;
	action?: React.ReactNode;
	className?: string;
	size?: 'sm' | 'md';
}

/** Explains what is missing and why it matters, instead of showing a bare button. */
export function KanbanEmptyState({
	icon: Icon,
	title,
	description,
	action,
	className,
	size = 'md',
}: KanbanEmptyStateProps) {
	const isSmall = size === 'sm';

	return (
		<div
			className={cn(
				'flex flex-col items-center justify-center text-center',
				isSmall ? 'gap-1.5 py-6' : 'gap-3 py-12',
				className
			)}
		>
			<Icon className={cn('text-muted-foreground/60', isSmall ? 'h-6 w-6' : 'h-10 w-10')} />
			<div className={cn('space-y-1', isSmall && 'space-y-0.5')}>
				<p className={cn('font-medium text-foreground', isSmall ? 'text-xs' : 'text-base')}>
					{title}
				</p>
				<p
					className={cn(
						'mx-auto text-muted-foreground',
						isSmall ? 'text-[11px]' : 'max-w-sm text-sm'
					)}
				>
					{description}
				</p>
			</div>
			{action}
		</div>
	);
}
