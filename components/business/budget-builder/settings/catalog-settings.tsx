'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { CatalogItem, PriceUnit } from '@/lib/budget-builder/types';
import { PRICE_UNITS } from '@/constants/budget-builder/budget-builder';
import { newId } from '@/helpers/budget-builder/calculate';

interface CatalogSettingsProps {
	catalog: CatalogItem[];
	onChange: (catalog: CatalogItem[]) => void;
}

export function CatalogSettings({ catalog, onChange }: CatalogSettingsProps) {
	const categories = [...new Set(catalog.map((item) => item.category).filter(Boolean))];

	const update = (id: string, changes: Partial<CatalogItem>) =>
		onChange(catalog.map((item) => (item.id === id ? { ...item, ...changes } : item)));

	const add = () =>
		onChange([{ id: newId(), name: '', category: '', unit: 'unidad', price: 0 }, ...catalog]);

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between gap-2">
				<p className="text-xs text-muted-foreground">
					Todo lo que puede llevar un trabajo, con su precio y en qué unidad se cobra.
				</p>
				<Button size="sm" variant="outline" onClick={add} className="gap-1 shrink-0">
					<Plus className="h-4 w-4" />
					Agregar insumo
				</Button>
			</div>

			<datalist id="budget-builder-categories">
				{categories.map((category) => (
					<option key={category} value={category} />
				))}
			</datalist>

			<div className="hidden sm:grid grid-cols-[1fr_9rem_8rem_8rem_2rem] gap-2 px-1 text-xs text-muted-foreground">
				<span>Nombre</span>
				<span>Categoría</span>
				<span>Unidad</span>
				<span>Precio</span>
				<span />
			</div>

			<div className="space-y-2">
				{catalog.map((item) => (
					<div
						key={item.id}
						className="grid grid-cols-2 gap-2 rounded-lg border border-border p-2 sm:grid-cols-[1fr_9rem_8rem_8rem_2rem] sm:border-0 sm:p-0"
					>
						<Input
							value={item.name}
							placeholder="Ej: Melamina 18 mm"
							onChange={(event) => update(item.id, { name: event.target.value })}
							className="col-span-2 sm:col-span-1"
						/>
						<Input
							value={item.category}
							placeholder="Categoría"
							list="budget-builder-categories"
							onChange={(event) => update(item.id, { category: event.target.value })}
						/>
						<Select
							value={item.unit}
							onValueChange={(unit) => update(item.id, { unit: unit as PriceUnit })}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{PRICE_UNITS.map((unit) => (
									<SelectItem key={unit.value} value={unit.value}>
										{unit.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Input
							type="number"
							min={0}
							value={item.price}
							onChange={(event) => update(item.id, { price: Number(event.target.value) })}
						/>
						<Button
							variant="ghost"
							size="icon"
							aria-label="Quitar insumo"
							onClick={() => onChange(catalog.filter((current) => current.id !== item.id))}
							className="justify-self-end text-muted-foreground hover:text-destructive"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				))}
			</div>
		</div>
	);
}
