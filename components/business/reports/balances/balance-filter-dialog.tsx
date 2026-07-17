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
import type { BalanceFilterDialogProps } from './types';
import { BALANCE_FILTER_LABELS, BALANCE_TYPES } from '@/constants/balances/balances-report';
import { formatNumber } from '@/utils/formats-money';

export function BalanceFilterDialog({
	open,
	onOpenChange,
	filters,
	onFiltersChange,
	onReset,
}: BalanceFilterDialogProps) {
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
					<DialogTitle>Filtros de saldos</DialogTitle>
					<DialogDescription>Filtra los saldos por tipo y rangos de monto</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					{/* Balance Type Filter */}
					<div className="grid grid-cols-4 gap-4">
						<Label htmlFor="balanceType" className="text-right">
							{BALANCE_FILTER_LABELS.balanceType}
						</Label>
						<div className="col-span-3">
							<Select
								value={filters.balanceType}
								onValueChange={(value) => handleFilterChange('balanceType', value)}
							>
								<SelectTrigger id="balanceType">
									<SelectValue placeholder="Todos los tipos" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Todos los tipos</SelectItem>
									<SelectItem value={BALANCE_TYPES.DEBTOR}>{BALANCE_TYPES.DEBTOR}</SelectItem>
									<SelectItem value={BALANCE_TYPES.CREDITOR}>{BALANCE_TYPES.CREDITOR}</SelectItem>
									<SelectItem value={BALANCE_TYPES.CANCELLED}>{BALANCE_TYPES.CANCELLED}</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Purchase ARS Amount Filters */}
					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="minPurchaseArs" className="text-center">
							{BALANCE_FILTER_LABELS.minPurchaseArs}
						</Label>
						<div className="col-span-3">
							<Input
								id="minPurchaseArs"
								type="text"
								placeholder="0"
								value={filters.minPurchaseArs}
								onChange={(e) => handleAmountChange('minPurchaseArs', e.target.value)}
							/>
						</div>
					</div>

					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="maxPurchaseArs" className="text-center">
							{BALANCE_FILTER_LABELS.maxPurchaseArs}
						</Label>
						<div className="col-span-3">
							<Input
								id="maxPurchaseArs"
								type="text"
								placeholder="Sin límite"
								value={filters.maxPurchaseArs}
								onChange={(e) => handleAmountChange('maxPurchaseArs', e.target.value)}
							/>
						</div>
					</div>

					{/* Deliveries ARS Amount Filters */}
					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="minDeliveriesArs" className="text-center">
							{BALANCE_FILTER_LABELS.minDeliveriesArs}
						</Label>
						<div className="col-span-3">
							<Input
								id="minDeliveriesArs"
								type="text"
								placeholder="0"
								value={filters.minDeliveriesArs}
								onChange={(e) => handleAmountChange('minDeliveriesArs', e.target.value)}
							/>
						</div>
					</div>

					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="maxDeliveriesArs" className="text-center">
							{BALANCE_FILTER_LABELS.maxDeliveriesArs}
						</Label>
						<div className="col-span-3">
							<Input
								id="maxDeliveriesArs"
								type="text"
								placeholder="Sin límite"
								value={filters.maxDeliveriesArs}
								onChange={(e) => handleAmountChange('maxDeliveriesArs', e.target.value)}
							/>
						</div>
					</div>

					{/* Balance ARS Amount Filters */}
					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="minBalanceArs" className="text-center">
							{BALANCE_FILTER_LABELS.minBalanceArs}
						</Label>
						<div className="col-span-3">
							<Input
								id="minBalanceArs"
								type="text"
								placeholder="0"
								value={filters.minBalanceArs}
								onChange={(e) => handleAmountChange('minBalanceArs', e.target.value)}
							/>
						</div>
					</div>

					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="maxBalanceArs" className="text-center">
							{BALANCE_FILTER_LABELS.maxBalanceArs}
						</Label>
						<div className="col-span-3">
							<Input
								id="maxBalanceArs"
								type="text"
								placeholder="Sin límite"
								value={filters.maxBalanceArs}
								onChange={(e) => handleAmountChange('maxBalanceArs', e.target.value)}
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
