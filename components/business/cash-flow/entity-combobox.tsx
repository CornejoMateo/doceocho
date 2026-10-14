'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export type EntityComboboxOption = { id: number; label: string };

type EntityComboboxProps = {
	value: string;
	onValueChange: (value: string) => void;
	options: EntityComboboxOption[];
	placeholder: string;
	searchPlaceholder?: string;
	emptyLabel?: string;
	disabled?: boolean;
	id?: string;
};

// Generic searchable Popover+Command select, shared by party (client/supplier) and work pickers.
export function EntityCombobox({
	value,
	onValueChange,
	options,
	placeholder,
	searchPlaceholder = 'Buscar...',
	emptyLabel = 'No encontrado',
	disabled = false,
	id,
}: EntityComboboxProps) {
	const [open, setOpen] = useState(false);
	const selected = options.find((option) => String(option.id) === value);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					id={id}
					type="button"
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="w-full justify-between font-normal"
					disabled={disabled}
				>
					<span className="truncate">{selected ? selected.label : placeholder}</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[--radix-popover-trigger-width] p-0">
				<Command>
					<CommandInput placeholder={searchPlaceholder} />
					<CommandList>
						<CommandEmpty>{emptyLabel}</CommandEmpty>
						<CommandGroup>
							{options.map((option) => (
								<CommandItem
									key={option.id}
									value={String(option.id)}
									keywords={[option.label]}
									onSelect={() => {
										onValueChange(String(option.id));
										setOpen(false);
									}}
								>
									{option.label}
									<Check
										className={cn(
											'ml-auto h-4 w-4',
											value === String(option.id) ? 'opacity-100' : 'opacity-0'
										)}
									/>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
