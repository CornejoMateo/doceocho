'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
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
import type { CatalogItem } from '@/lib/budget-builder/types';
import { UNIT_SHORT } from '@/constants/budget-builder/budget-builder';
import { formatCurrency } from '@/utils/formats-money';

interface CatalogPickerProps {
	catalog: CatalogItem[];
	/** Called with the chosen catalog item, or null for a free line. */
	onPick: (item: CatalogItem | null) => void;
}

/** Type a few letters ("caño", "laca") instead of scrolling a long list. */
export function CatalogPicker({ catalog, onPick }: CatalogPickerProps) {
	const [open, setOpen] = useState(false);

	const byCategory = catalog.reduce<Record<string, CatalogItem[]>>((groups, item) => {
		(groups[item.category || 'Otros'] ??= []).push(item);
		return groups;
	}, {});

	const pick = (item: CatalogItem | null) => {
		onPick(item);
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline" size="sm" className="gap-2 text-muted-foreground">
					<Plus className="h-4 w-4" />
					Agregar insumo
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80 p-0" align="start">
				<Command>
					<CommandInput placeholder="Buscar insumo..." />
					<CommandList>
						<CommandEmpty>No está en el catálogo.</CommandEmpty>
						{Object.entries(byCategory).map(([category, items]) => (
							<CommandGroup key={category} heading={category}>
								{items.map((item) => (
									<CommandItem
										key={item.id}
										value={`${item.name} ${item.category}`}
										onSelect={() => pick(item)}
									>
										<span className="flex-1 truncate">{item.name}</span>
										<span className="text-xs opacity-60">
											{formatCurrency(item.price)}/{UNIT_SHORT[item.unit]}
										</span>
									</CommandItem>
								))}
							</CommandGroup>
						))}
						<CommandGroup heading="Otro">
							<CommandItem value="linea libre otro" onSelect={() => pick(null)}>
								Línea libre (no está en el catálogo)
							</CommandItem>
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
