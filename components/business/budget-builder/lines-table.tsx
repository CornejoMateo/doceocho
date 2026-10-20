'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { BudgetLine, CatalogItem, PriceUnit } from '@/lib/budget-builder/types';
import { PRICE_UNITS, UNIT_SHORT } from '@/constants/budget-builder/budget-builder';
import { lineFromCatalog, newId, type EvaluatedLine } from '@/helpers/budget-builder/calculate';
import { formatCurrency } from '@/utils/formats-money';
import { CatalogPicker } from '@/components/business/budget-builder/catalog-picker';

interface LinesTableProps {
	lines: EvaluatedLine[];
	catalog: CatalogItem[];
	onChange: (lines: BudgetLine[]) => void;
}

const formatAmount = (value: number) =>
	new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(value);

/** Strips the computed fields before handing the lines back. */
const toLine = ({ amount: _a, subtotal: _s, error: _e, ...line }: EvaluatedLine): BudgetLine =>
	line;

export function LinesTable({ lines, catalog, onChange }: LinesTableProps) {
	const update = (id: string, changes: Partial<BudgetLine>) =>
		onChange(
			lines.map((line) => (line.id === id ? { ...toLine(line), ...changes } : toLine(line)))
		);

	const remove = (id: string) => onChange(lines.filter((line) => line.id !== id).map(toLine));

	const add = (item: CatalogItem | null) => {
		const line: BudgetLine = item
			? lineFromCatalog(item)
			: {
					id: newId(),
					itemId: null,
					name: '',
					category: 'Otros',
					unit: 'unidad',
					price: 0,
					quantity: '1',
				};
		onChange([...lines.map(toLine), line]);
	};

	return (
		<div className="space-y-2">
			<div className="hidden md:grid grid-cols-[1fr_10rem_7rem_7rem_2rem] gap-2 px-1 text-[11px] uppercase tracking-wide text-muted-foreground">
				<span>Insumo</span>
				<span>Cantidad</span>
				<span>Precio</span>
				<span className="text-right">Subtotal</span>
				<span />
			</div>

			{lines.map((line) => (
				<div
					key={line.id}
					className="grid grid-cols-2 gap-2 rounded-lg border border-border p-2 md:grid-cols-[1fr_13rem_7rem_7rem_2rem] md:items-start md:border-0 md:p-0"
				>
					<div className="col-span-2 md:col-span-1">
						{line.itemId ? (
							<div className="flex h-9 items-center gap-2 px-1">
								<span className="truncate text-sm text-foreground">{line.name}</span>
								<span className="shrink-0 text-[11px] text-muted-foreground">{line.category}</span>
							</div>
						) : (
							<div className="grid grid-cols-[1fr_6rem] gap-2">
								<Input
									value={line.name}
									placeholder="Descripción"
									onChange={(event) => update(line.id, { name: event.target.value })}
								/>
								<Select
									value={line.unit}
									onValueChange={(unit) => update(line.id, { unit: unit as PriceUnit })}
								>
									<SelectTrigger className="w-full" aria-label="Unidad">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{PRICE_UNITS.map((unit) => (
											<SelectItem key={unit.value} value={unit.value}>
												{unit.short}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					</div>

					<div>
						<div className="relative">
							<Input
								value={line.quantity}
								aria-label="Cantidad o fórmula"
								onChange={(event) => update(line.id, { quantity: event.target.value })}
								className={`pr-8 font-mono text-xs ${line.error ? 'border-destructive' : ''}`}
							/>
							<span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
								{UNIT_SHORT[line.unit]}
							</span>
						</div>
						<p
							className={`mt-0.5 px-1 text-[11px] ${line.error ? 'text-destructive' : 'text-muted-foreground'}`}
						>
							{line.error ?? `= ${formatAmount(line.amount)} ${UNIT_SHORT[line.unit]}`}
						</p>
					</div>

					<Input
						type="number"
						min={0}
						value={line.price}
						aria-label="Precio unitario"
						onChange={(event) => update(line.id, { price: Number(event.target.value) || 0 })}
					/>

					<span className="flex h-9 items-center justify-end text-sm tabular-nums text-foreground">
						{formatCurrency(line.subtotal)}
					</span>

					<Button
						variant="ghost"
						size="icon"
						aria-label="Quitar línea"
						onClick={() => remove(line.id)}
						className="justify-self-end text-muted-foreground hover:text-destructive"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			))}

			<CatalogPicker catalog={catalog} onPick={add} />
		</div>
	);
}
