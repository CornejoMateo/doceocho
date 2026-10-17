'use client';

import { MapPin } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface AddressLinkProps {
	address: string | null;
	locality?: string | null;
	className?: string;
	onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function AddressLink({ address, locality, className, onClick }: AddressLinkProps) {
	if (!address && !locality) {
		return (
			<span className={cn('text-muted-foreground', className)}>Dirección no especificada</span>
		);
	}

	const query = [address, locality].filter(Boolean).join(', ');
	const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

	return (
		<Link
			href={mapsUrl}
			target="_blank"
			rel="noopener noreferrer"
			onClick={onClick}
			className={cn(
				'inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline',
				'transition-colors duration-200',
				className
			)}
		>
			<MapPin className="h-4 w-4 flex-shrink-0" />
			<span>
				{address}
				{address && locality ? `, ${locality}` : locality ? locality : ''}
			</span>
		</Link>
	);
}
