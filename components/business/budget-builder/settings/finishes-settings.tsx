'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Finish } from '@/lib/budget-builder/types';
import { newId } from '@/helpers/budget-builder/id';

interface FinishesSettingsProps {
	finishes: Finish[];
	onChange: (finishes: Finish[]) => void;
}

export function FinishesSettings({ finishes, onChange }: FinishesSettingsProps) {
	const update = (id: string, changes: Partial<Finish>) =>
		onChange(finishes.map((finish) => (finish.id === id ? { ...finish, ...changes } : finish)));

	const add = () => onChange([{ id: newId(), name: '', color: '#c8a27a', price: 0 }, ...finishes]);

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between gap-2">
				<p className="text-xs text-muted-foreground">
					Colores y terminaciones que se eligen en cada mueble. El precio es por m² y se suma solo
					según la superficie a terminar; dejalo en 0 si ya está incluido en los insumos.
				</p>
				<Button size="sm" variant="outline" onClick={add} className="gap-1 shrink-0">
					<Plus className="h-4 w-4" />
					Agregar terminación
				</Button>
			</div>

			<div className="hidden sm:grid grid-cols-[3rem_1fr_9rem_2rem] gap-2 px-1 text-xs text-muted-foreground">
				<span>Color</span>
				<span>Nombre</span>
				<span>Precio por m²</span>
				<span />
			</div>

			<div className="space-y-2">
				{finishes.map((finish) => (
					<div
						key={finish.id}
						className="grid grid-cols-[3rem_1fr_2rem] gap-2 rounded-lg border border-border p-2 sm:grid-cols-[3rem_1fr_9rem_2rem] sm:border-0 sm:p-0"
					>
						<Input
							type="color"
							value={finish.color}
							aria-label="Color"
							onChange={(event) => update(finish.id, { color: event.target.value })}
							className="h-9 cursor-pointer p-1"
						/>
						<Input
							value={finish.name}
							placeholder="Ej: Laqueado verde salvia"
							onChange={(event) => update(finish.id, { name: event.target.value })}
						/>
						<Input
							type="number"
							min={0}
							value={finish.price}
							aria-label="Precio por m²"
							onChange={(event) => update(finish.id, { price: Number(event.target.value) || 0 })}
							className="col-span-2 sm:col-span-1"
						/>
						<Button
							variant="ghost"
							size="icon"
							aria-label="Quitar terminación"
							onClick={() => onChange(finishes.filter((current) => current.id !== finish.id))}
							className="col-start-3 row-start-1 justify-self-end text-muted-foreground hover:text-destructive sm:col-start-auto sm:row-start-auto"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				))}
			</div>
		</div>
	);
}
