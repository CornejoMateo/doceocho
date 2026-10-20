'use client';

import { Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { BudgetItem, CatalogItem, FurnitureShape } from '@/lib/budget-builder/types';
import { FINISHES, SHAPES } from '@/constants/budget-builder/budget-builder';
import type { ItemCost } from '@/helpers/budget-builder/calculate';
import { formatCurrency } from '@/utils/formats-money';
import { DimensionsFields } from '@/components/business/budget-builder/dimensions-fields';
import { Furniture3D } from '@/components/business/budget-builder/furniture-3d';
import { LinesTable } from '@/components/business/budget-builder/lines-table';

interface BudgetItemCardProps {
	item: BudgetItem;
	calc: ItemCost;
	price: number;
	catalog: CatalogItem[];
	onChange: (item: BudgetItem) => void;
	onDuplicate: () => void;
	onRemove: () => void;
}

export function BudgetItemCard({
	item,
	calc,
	price,
	catalog,
	onChange,
	onDuplicate,
	onRemove,
}: BudgetItemCardProps) {
	const set = (changes: Partial<BudgetItem>) => onChange({ ...item, ...changes });

	return (
		<Card className="gap-0 overflow-hidden border-border bg-card p-0">
			<div className="flex items-center gap-2 border-b border-border p-3">
				<Input
					value={item.name}
					onChange={(event) => set({ name: event.target.value })}
					className="h-9 border-0 px-1 text-base font-semibold shadow-none focus-visible:ring-1"
					aria-label="Nombre del mueble"
				/>
				<Button variant="ghost" size="icon" aria-label="Duplicar mueble" onClick={onDuplicate}>
					<Copy className="h-4 w-4" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Quitar mueble"
					onClick={onRemove}
					className="text-muted-foreground hover:text-destructive"
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>

			<div className="grid gap-4 p-3 lg:grid-cols-[1fr_20rem]">
				<div className="space-y-3">
					<div className="grid gap-2 sm:grid-cols-[1fr_1fr_5rem]">
						<div className="grid gap-1">
							<Label className="text-xs text-muted-foreground">Forma</Label>
							<Select
								value={item.shape}
								onValueChange={(shape) => set({ shape: shape as FurnitureShape })}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{SHAPES.map((shape) => (
										<SelectItem key={shape.value} value={shape.value}>
											{shape.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-1">
							<Label className="text-xs text-muted-foreground">Terminación</Label>
							<Select value={item.finish} onValueChange={(finish) => set({ finish })}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{FINISHES.map((finish) => (
										<SelectItem key={finish.value} value={finish.value}>
											<span className="flex items-center gap-2">
												<span
													className="h-3 w-3 rounded-full border border-border"
													style={{ backgroundColor: finish.color }}
												/>
												{finish.label}
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-1">
							<Label htmlFor={`${item.id}-units`} className="text-xs text-muted-foreground">
								Cantidad
							</Label>
							<Input
								id={`${item.id}-units`}
								type="number"
								min={1}
								value={item.units}
								onChange={(event) => set({ units: Math.max(Number(event.target.value) || 1, 1) })}
							/>
						</div>
					</div>

					<DimensionsFields
						idPrefix={item.id}
						shape={item.shape}
						dimensions={item.dimensions}
						onChange={(dimensions) => set({ dimensions })}
					/>

					<Textarea
						value={item.notes}
						onChange={(event) => set({ notes: event.target.value })}
						placeholder="Detalle para el cliente (opcional): herrajes ocultos, cantos redondeados..."
						className="min-h-16 text-sm"
					/>
				</div>

				<Furniture3D
					shape={item.shape}
					dimensions={item.dimensions}
					finish={item.finish}
					className="h-64 lg:h-full lg:min-h-64"
				/>
			</div>

			<div className="space-y-3 border-t border-border p-3">
				<LinesTable lines={calc.lines} catalog={catalog} onChange={(lines) => set({ lines })} />

				<div className="flex flex-wrap items-baseline justify-end gap-x-6 gap-y-1 text-sm">
					<span className="text-muted-foreground">
						Costo {item.units > 1 ? `(${item.units} u.)` : ''}{' '}
						<span className="tabular-nums text-foreground">{formatCurrency(calc.cost)}</span>
					</span>
					<span className="text-muted-foreground">
						Precio al cliente{' '}
						<span className="text-base font-semibold tabular-nums text-foreground">
							{formatCurrency(price)}
						</span>
					</span>
				</div>
			</div>
		</Card>
	);
}
