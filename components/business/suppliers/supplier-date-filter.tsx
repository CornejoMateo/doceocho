import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';

interface SupplierDateFilterProps {
	filterFrom: string;
	filterTo: string;
	onFilterFromChange: (value: string) => void;
	onFilterToChange: (value: string) => void;
	onClear: () => void;
}

export function SupplierDateFilter({
	filterFrom,
	filterTo,
	onFilterFromChange,
	onFilterToChange,
	onClear,
}: SupplierDateFilterProps) {
	return (
		<div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
			<div className="space-y-1">
				<Label htmlFor="filter-from" className="text-xs text-muted-foreground">
					Desde
				</Label>
				<DatePicker
					id="filter-from"
					value={filterFrom}
					onChange={onFilterFromChange}
					placeholder="Desde"
					toDate={filterTo ? new Date(`${filterTo}T00:00:00`) : undefined}
					className="w-full md:w-auto md:min-w-[150px]"
				/>
			</div>
			<div className="space-y-1">
				<Label htmlFor="filter-to" className="text-xs text-muted-foreground">
					Hasta
				</Label>
				<DatePicker
					id="filter-to"
					value={filterTo}
					onChange={onFilterToChange}
					placeholder="Hasta"
					fromDate={filterFrom ? new Date(`${filterFrom}T00:00:00`) : undefined}
					className="w-full md:w-auto md:min-w-[150px]"
				/>
			</div>
			{(filterFrom || filterTo) && (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="min-h-11 self-start md:min-h-9 md:self-end"
					onClick={onClear}
				>
					Limpiar filtro
				</Button>
			)}
		</div>
	);
}
