'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DatePickerProps {
	/** Plain `yyyy-MM-dd` value, matching how dates are stored. */
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
	id?: string;
	className?: string;
	fromDate?: Date;
	toDate?: Date;
}

/** Parses a plain date without letting the local timezone shift the day. */
function parseValue(value: string): Date | undefined {
	if (!value) return undefined;

	const date = new Date(`${value}T00:00:00`);

	return Number.isNaN(date.getTime()) ? undefined : date;
}

export function DatePicker({
	value,
	onChange,
	placeholder = 'Elegí una fecha',
	disabled,
	id,
	className,
	fromDate,
	toDate,
}: DatePickerProps) {
	const [isOpen, setIsOpen] = useState(false);

	const selectedDate = parseValue(value);

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button
					id={id}
					type="button"
					variant="outline"
					disabled={disabled}
					className={cn(
						'w-full text-left font-normal',
						!selectedDate && 'text-muted-foreground',
						className
					)}
				>
					{selectedDate ? format(selectedDate, 'PPP', { locale: es }) : <span>{placeholder}</span>}
					<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={selectedDate}
					onSelect={(date) => {
						onChange(date ? format(date, 'yyyy-MM-dd') : '');
						setIsOpen(false);
					}}
					locale={es}
					disabled={
						fromDate || toDate
							? (date) => (fromDate ? date < fromDate : false) || (toDate ? date > toDate : false)
							: undefined
					}
				/>
			</PopoverContent>
		</Popover>
	);
}
