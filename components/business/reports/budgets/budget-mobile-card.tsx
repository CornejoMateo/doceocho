'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatCurrencyUSD } from '@/utils/formats-money';
import type { BudgetReportRow } from './types';

interface BudgetMobileCardProps {
	row: BudgetReportRow;
}

export function BudgetMobileCard({ row }: BudgetMobileCardProps) {
	return (
		<Card className="p-4 border-border">
			<div className="space-y-3">
				<div className="flex items-start justify-between gap-2">
					<div className="flex-1 min-w-0">
						<h4 className="font-semibold text-foreground break-words">{row.client}</h4>
						<p className="text-sm text-muted-foreground break-words">{row.work}</p>
					</div>
					<Badge variant="secondary" className="flex-shrink-0">
						{row.status}
					</Badge>
				</div>
				<div className="grid grid-cols-2 gap-2 text-sm">
					<div>
						<p className="text-muted-foreground text-xs">Fecha</p>
						<p className="font-medium">{row.date}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs">Número</p>
						<p className="font-medium">{row.number}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs">Tipo</p>
						<p className="font-medium">{row.type}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs">ARS</p>
						<p className="font-medium">{formatCurrency(row.amountArs)}</p>
					</div>
					<div className="col-span-2">
						<p className="text-muted-foreground text-xs">USD</p>
						<p className="font-medium">{formatCurrencyUSD(row.amountUsd)}</p>
					</div>
				</div>
			</div>
		</Card>
	);
}
