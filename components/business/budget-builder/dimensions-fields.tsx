'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FurnitureDimensions, FurnitureShape } from '@/lib/budget-builder/types';
import { DIMENSION_LABELS, SHAPES } from '@/constants/budget-builder/budget-builder';

const SIZE_FIELDS: (keyof FurnitureDimensions)[] = ['width', 'depth', 'height', 'thickness'];

interface DimensionsFieldsProps {
	shape: FurnitureShape;
	dimensions: FurnitureDimensions;
	onChange: (dimensions: FurnitureDimensions) => void;
	idPrefix: string;
}

/** Measurements in cm, plus only the counts the shape actually uses. */
export function DimensionsFields({ shape, dimensions, onChange, idPrefix }: DimensionsFieldsProps) {
	const countFields = SHAPES.find((candidate) => candidate.value === shape)?.fields ?? [];
	const fields = [...SIZE_FIELDS, ...countFields];

	return (
		<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
			{fields.map((field) => {
				const isCount = !SIZE_FIELDS.includes(field);
				const id = `${idPrefix}-${field}`;

				return (
					<div key={field} className="grid gap-1">
						<Label htmlFor={id} className="text-xs text-muted-foreground">
							{DIMENSION_LABELS[field]}
							{isCount ? '' : ' (cm)'}
						</Label>
						<Input
							id={id}
							type="number"
							min={0}
							step={isCount ? 1 : 0.1}
							value={dimensions[field]}
							onChange={(event) =>
								onChange({ ...dimensions, [field]: Number(event.target.value) || 0 })
							}
						/>
					</div>
				);
			})}
		</div>
	);
}
