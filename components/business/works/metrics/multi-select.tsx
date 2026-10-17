'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import type { FilterOption } from '@/lib/works/metrics';

interface MultiSelectProps {
	id: string;
	label: string;
	options: FilterOption[];
	selected: string[];
	onChange: (next: string[]) => void;
	/** Shown when nothing is selected, e.g. "Todas". */
	emptyLabel?: string;
}

export function MultiSelect({
	id,
	label,
	options,
	selected,
	onChange,
	emptyLabel = 'Todos',
}: MultiSelectProps) {
	const [open, setOpen] = useState(false);

	const summary =
		selected.length === 0
			? emptyLabel
			: selected.length === 1
				? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
				: `${selected.length} seleccionados`;

	const toggle = (value: string) =>
		onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

	return (
		<div className="space-y-1.5">
			<label htmlFor={id} className="text-sm font-medium text-foreground">
				{label}
			</label>
			{/* modal: keeps the list scrollable when opened inside the filters sheet */}
			<Popover open={open} onOpenChange={setOpen} modal>
				<PopoverTrigger asChild>
					<Button
						id={id}
						type="button"
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className={cn(
							'w-full justify-between font-normal',
							selected.length === 0 && 'text-muted-foreground'
						)}
					>
						<span className="truncate">{summary}</span>
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					className="w-[var(--radix-popover-trigger-width)] min-w-56 p-0"
					align="start"
				>
					<Command>
						<CommandInput placeholder={`Buscar ${label.toLowerCase()}`} />
						<CommandList>
							<CommandEmpty>Ningún resultado</CommandEmpty>
							<CommandGroup>
								{options.map((o) => {
									const active = selected.includes(o.value);
									return (
										<CommandItem
											key={o.value}
											value={`${o.label} ${o.value}`}
											onSelect={() => toggle(o.value)}
										>
											<Check className={cn('h-4 w-4', active ? 'opacity-100' : 'opacity-0')} />
											<span
												className={cn(
													'flex-1 truncate',
													o.value === 'sin dato' && 'italic text-muted-foreground'
												)}
											>
												{o.label}
											</span>
											<span className="text-xs text-muted-foreground">{o.count}</span>
										</CommandItem>
									);
								})}
							</CommandGroup>
						</CommandList>
					</Command>
					{selected.length > 0 && (
						<div className="border-t p-1">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="w-full"
								onClick={() => onChange([])}
							>
								Quitar selección
							</Button>
						</div>
					)}
				</PopoverContent>
			</Popover>
		</div>
	);
}
