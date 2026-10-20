'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type {
	CatalogItem,
	FurnitureShape,
	FurnitureTemplate,
	TemplateLine,
} from '@/lib/budget-builder/types';
import { SHAPES, UNIT_SHORT } from '@/constants/budget-builder/budget-builder';
import { newId } from '@/helpers/budget-builder/calculate';
import { DimensionsFields } from '@/components/business/budget-builder/dimensions-fields';
import { FormulaHelp } from '@/components/business/budget-builder/formula-help';

interface TemplatesSettingsProps {
	templates: FurnitureTemplate[];
	catalog: CatalogItem[];
	onChange: (templates: FurnitureTemplate[]) => void;
}

export function TemplatesSettings({ templates, catalog, onChange }: TemplatesSettingsProps) {
	const update = (id: string, changes: Partial<FurnitureTemplate>) =>
		onChange(
			templates.map((template) => (template.id === id ? { ...template, ...changes } : template))
		);

	const updateLines = (template: FurnitureTemplate, lines: TemplateLine[]) =>
		update(template.id, { lines });

	const add = () =>
		onChange([
			{
				id: newId(),
				name: 'Nuevo mueble',
				shape: 'mueble',
				dimensions: {
					width: 100,
					depth: 40,
					height: 80,
					thickness: 1.8,
					legs: 0,
					shelves: 1,
					doors: 2,
				},
				lines: [],
			},
			...templates,
		]);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-2">
				<p className="text-xs text-muted-foreground">
					Lo que se elige al presupuestar: medidas de partida y qué lleva cada uno.
				</p>
				<Button size="sm" variant="outline" onClick={add} className="gap-1 shrink-0">
					<Plus className="h-4 w-4" />
					Agregar tipo
				</Button>
			</div>

			<FormulaHelp />

			{templates.map((template) => (
				<div key={template.id} className="space-y-3 rounded-lg border border-border p-3">
					<div className="grid gap-2 sm:grid-cols-[1fr_1fr_2rem]">
						<Input
							value={template.name}
							onChange={(event) => update(template.id, { name: event.target.value })}
							aria-label="Nombre del tipo de mueble"
						/>
						<Select
							value={template.shape}
							onValueChange={(shape) => update(template.id, { shape: shape as FurnitureShape })}
						>
							<SelectTrigger className="w-full" aria-label="Forma">
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
						<Button
							variant="ghost"
							size="icon"
							aria-label="Quitar tipo de mueble"
							onClick={() => onChange(templates.filter((current) => current.id !== template.id))}
							className="justify-self-end text-muted-foreground hover:text-destructive"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>

					<DimensionsFields
						idPrefix={`template-${template.id}`}
						shape={template.shape}
						dimensions={template.dimensions}
						onChange={(dimensions) => update(template.id, { dimensions })}
					/>

					<div className="space-y-2">
						<Label className="text-xs text-muted-foreground">Qué lleva</Label>
						{template.lines.map((line, index) => {
							const item = catalog.find((candidate) => candidate.id === line.itemId);

							return (
								<div
									key={`${line.itemId}-${index}`}
									className="grid grid-cols-[1fr_12rem_2rem] gap-2"
								>
									<Select
										value={line.itemId}
										onValueChange={(itemId) =>
											updateLines(
												template,
												template.lines.map((current, i) =>
													i === index ? { ...current, itemId } : current
												)
											)
										}
									>
										<SelectTrigger className="w-full" aria-label="Insumo">
											<SelectValue placeholder="Elegí un insumo" />
										</SelectTrigger>
										<SelectContent>
											{catalog.map((candidate) => (
												<SelectItem key={candidate.id} value={candidate.id}>
													{candidate.name || 'Sin nombre'}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<div className="relative">
										<Input
											value={line.quantity}
											aria-label="Cantidad o fórmula"
											onChange={(event) =>
												updateLines(
													template,
													template.lines.map((current, i) =>
														i === index ? { ...current, quantity: event.target.value } : current
													)
												)
											}
											className="pr-8 font-mono text-xs"
										/>
										{item && (
											<span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
												{UNIT_SHORT[item.unit]}
											</span>
										)}
									</div>
									<Button
										variant="ghost"
										size="icon"
										aria-label="Quitar línea"
										onClick={() =>
											updateLines(
												template,
												template.lines.filter((_, i) => i !== index)
											)
										}
										className="text-muted-foreground hover:text-destructive"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							);
						})}
						<Button
							size="sm"
							variant="ghost"
							className="gap-1"
							disabled={catalog.length === 0}
							onClick={() =>
								updateLines(template, [...template.lines, { itemId: catalog[0].id, quantity: '1' }])
							}
						>
							<Plus className="h-4 w-4" />
							Agregar línea
						</Button>
					</div>
				</div>
			))}
		</div>
	);
}
