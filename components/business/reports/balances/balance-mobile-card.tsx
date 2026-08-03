'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/formats-money';
import type { BalanceReportRow } from './balances-report';

interface BalanceMobileCardProps {
	row: BalanceReportRow;
}

export function BalanceMobileCard({ row }: BalanceMobileCardProps) {
	return (
		<Card className="p-4 border-border">
			<div className="space-y-3">
				<div className="flex items-start justify-between gap-2">
					<div className="flex-1 min-w-0">
						<h4 className="font-semibold text-foreground break-words">{row.client}</h4>
						<p className="text-sm text-muted-foreground break-words">{row.work}</p>
					</div>
					<Badge variant="secondary" className="flex-shrink-0">
						{row.balanceType}
					</Badge>
				</div>
				<div className="grid grid-cols-2 gap-2 text-sm">
					<div>
						<p className="text-muted-foreground text-xs">Fecha</p>
						<p className="font-medium">{row.contractDate}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs">Concepto</p>
						<p className="font-medium">{row.concept}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs">Compra</p>
						<p className="font-medium">{formatCurrency(row.purchaseArs)}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs">Entregas</p>
						<p className="font-medium">{formatCurrency(row.deliveriesArs)}</p>
					</div>
					<div className="col-span-2">
						<p className="text-muted-foreground text-xs">Saldo</p>
						<p className="font-medium">{formatCurrency(row.balanceAmountArs)}</p>
					</div>
				</div>
			</div>
		</Card>
	);
}
