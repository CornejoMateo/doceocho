import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { BudgetFilterDialogProps } from './types';
import { BUDGET_FILTER_LABELS, BUDGET_STATUS } from '@/constants/budgets/budgets-report';
import { formatNumber } from '@/utils/formats-money';

export function BudgetFilterDialog({
	open,
	onOpenChange,
	filters,
	onFiltersChange,
	onReset,
}: BudgetFilterDialogProps) {
	const handleFilterChange = (key: keyof typeof filters, value: string) => {
		onFiltersChange({ ...filters, [key]: value });
	};

	const handleAmountChange = (key: keyof typeof filters, value: string) => {
		const formatted = formatNumber(value);
		onFiltersChange({ ...filters, [key]: formatted });
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="!sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Filtros de presupuestos</DialogTitle>
					<DialogDescription>
						Filtra los presupuestos por estado y rangos de monto
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					{/* Status Filter */}
					<div className="grid grid-cols-4 gap-4">
						<Label htmlFor="status" className="text-right">
							{BUDGET_FILTER_LABELS.status}
						</Label>
						<div className="col-span-3">
							<Select
								value={filters.status}
								onValueChange={(value) => handleFilterChange('status', value)}
							>
								<SelectTrigger id="status">
									<SelectValue placeholder="Todos los estados" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Todos los estados</SelectItem>
									<SelectItem value={BUDGET_STATUS.PENDING}>{BUDGET_STATUS.PENDING}</SelectItem>
									<SelectItem value={BUDGET_STATUS.ACCEPTED}>{BUDGET_STATUS.ACCEPTED}</SelectItem>
									<SelectItem value={BUDGET_STATUS.SOLD}>{BUDGET_STATUS.SOLD}</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* ARS Amount Filters */}
					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="minAmountArs" className="text-center">
							{BUDGET_FILTER_LABELS.minAmountArs}
						</Label>
						<div className="col-span-3">
							<Input
								id="minAmountArs"
								type="text"
								placeholder="0"
								value={filters.minAmountArs}
								onChange={(e) => handleAmountChange('minAmountArs', e.target.value)}
							/>
						</div>
					</div>

					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="maxAmountArs" className="text-center">
							{BUDGET_FILTER_LABELS.maxAmountArs}
						</Label>
						<div className="col-span-3">
							<Input
								id="maxAmountArs"
								type="text"
								placeholder="Sin límite"
								value={filters.maxAmountArs}
								onChange={(e) => handleAmountChange('maxAmountArs', e.target.value)}
							/>
						</div>
					</div>

					{/* USD Amount Filters */}
					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="minAmountUsd" className="text-center">
							{BUDGET_FILTER_LABELS.minAmountUsd}
						</Label>
						<div className="col-span-3">
							<Input
								id="minAmountUsd"
								type="text"
								placeholder="0"
								value={filters.minAmountUsd}
								onChange={(e) => handleAmountChange('minAmountUsd', e.target.value)}
							/>
						</div>
					</div>

					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="maxAmountUsd" className="text-center">
							{BUDGET_FILTER_LABELS.maxAmountUsd}
						</Label>
						<div className="col-span-3">
							<Input
								id="maxAmountUsd"
								type="text"
								placeholder="Sin límite"
								value={filters.maxAmountUsd}
								onChange={(e) => handleAmountChange('maxAmountUsd', e.target.value)}
							/>
						</div>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onReset}>
						Limpiar filtros
					</Button>
					<Button onClick={() => onOpenChange(false)}>Aceptar</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
