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
import type { BudgetItem, CatalogItem, Finish, FurnitureShape } from '@/lib/budget-builder/types';
import { SHAPES } from '@/constants/budget-builder/budget-builder';
import { applyFinish, finishOf } from '@/helpers/budget-builder/finishes';
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
	finishes: Finish[];
	onChange: (item: BudgetItem) => void;
	onDuplicate: () => void;
	onRemove: () => void;
}

export function BudgetItemCard({
	item,
	calc,
	price,
	catalog,
	finishes,
	onChange,
	onDuplicate,
	onRemove,
}: BudgetItemCardProps) {
	const set = (changes: Partial<BudgetItem>) => onChange({ ...item, ...changes });
	const currentFinish = finishOf(item);

	// A finish removed from settings still shows on the pieces that already use it.
	const finishOptions: Finish[] = finishes.some((finish) => finish.id === item.finish)
		? finishes
		: [
				...finishes,
				{ id: item.finish, name: currentFinish.name, color: currentFinish.color, price: 0 },
			];

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
					<div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-2">
						<div className="grid min-w-0 gap-1">
							<Label className="text-xs text-muted-foreground">Forma</Label>
							<Select
								value={item.shape}
								onValueChange={(shape) => set({ shape: shape as FurnitureShape })}
							>
								<SelectTrigger className="w-full min-w-0 overflow-hidden">
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
						<div className="order-last col-span-2 grid min-w-0 gap-1">
							<Label className="text-xs text-muted-foreground">Terminación</Label>
							<Select
								value={item.finish}
								onValueChange={(id) => {
									const finish = finishOptions.find((option) => option.id === id);
									if (finish) onChange(applyFinish(item, finish));
								}}
							>
								<SelectTrigger className="w-full min-w-0 overflow-hidden">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{finishOptions.map((finish) => (
										<SelectItem key={finish.id} value={finish.id}>
											<span className="flex min-w-0 items-center gap-2">
												<span
													className="h-3 w-3 shrink-0 rounded-full border border-border"
													style={{ backgroundColor: finish.color }}
												/>
												<span className="truncate">{finish.name}</span>
												{finish.price > 0 && (
													<span className="shrink-0 text-xs opacity-60">
														{formatCurrency(finish.price)}/m²
													</span>
												)}
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="grid min-w-0 gap-1">
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
					color={currentFinish.color}
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
