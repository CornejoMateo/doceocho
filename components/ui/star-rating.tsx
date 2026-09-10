'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MAX_RATING } from '@/constants/human-resources/evaluations';

const SIZE_CLASSES = {
	sm: 'h-4 w-4',
	md: 'h-5 w-5',
	lg: 'h-7 w-7',
} as const;

interface StarRatingProps {
	value: number | null;
	onChange?: (value: number) => void;
	size?: keyof typeof SIZE_CLASSES;
	max?: number;
	className?: string;
	/** Accessible name for the group, e.g. "Puntuación de Juan Pérez". */
	label?: string;
}

export function StarRating({
	value,
	onChange,
	size = 'md',
	max = MAX_RATING,
	className,
	label,
}: StarRatingProps) {
	const [hoveredValue, setHoveredValue] = useState<number | null>(null);

	const isInteractive = Boolean(onChange);
	const displayedValue = hoveredValue ?? value ?? 0;

	return (
		<div
			className={cn('flex items-center gap-0.5', className)}
			role={isInteractive ? 'radiogroup' : 'img'}
			aria-label={label ?? `Puntuación: ${value ?? 'sin puntuar'} de ${max}`}
			onMouseLeave={() => setHoveredValue(null)}
		>
			{Array.from({ length: max }, (_, index) => {
				const starValue = index + 1;
				const isFilled = starValue <= displayedValue;

				const star = (
					<Star
						className={cn(
							SIZE_CLASSES[size],
							'transition-colors',
							isFilled ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40'
						)}
					/>
				);

				if (!isInteractive) {
					return <span key={starValue}>{star}</span>;
				}

				return (
					<button
						key={starValue}
						type="button"
						role="radio"
						aria-checked={value === starValue}
						aria-label={`${starValue} de ${max}`}
						className="cursor-pointer rounded-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						onClick={() => onChange?.(starValue)}
						onMouseEnter={() => setHoveredValue(starValue)}
					>
						{star}
					</button>
				);
			})}
		</div>
	);
}
