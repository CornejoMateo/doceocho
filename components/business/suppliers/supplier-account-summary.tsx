import { formatCurrency } from '@/utils/formats-money';

interface SupplierAccountSummaryProps {
	totalPurchasesArs: number;
	totalPaymentsArs: number;
	balanceArs: number;
}

export function SupplierAccountSummary({
	totalPurchasesArs,
	totalPaymentsArs,
	balanceArs,
}: SupplierAccountSummaryProps) {
	return (
		<div className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 text-sm sm:grid-cols-3">
			<div>
				<div className="text-muted-foreground">Compras</div>
				<div className="font-semibold">{formatCurrency(totalPurchasesArs)}</div>
			</div>
			<div>
				<div className="text-muted-foreground">Pagado</div>
				<div className="font-semibold">{formatCurrency(totalPaymentsArs)}</div>
			</div>
			<div>
				<div className="text-muted-foreground">Saldo a pagar</div>
				<div
					className={`font-semibold ${
						balanceArs > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'
					}`}
				>
					{formatCurrency(balanceArs)}
				</div>
			</div>
		</div>
	);
}
