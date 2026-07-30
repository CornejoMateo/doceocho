'use client';

import { Card } from '@/components/ui/card';
import { DollarSign, ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react';
import { formatCurrency } from '@/utils/formats-money';

interface CashBoxSummary {
	id: number;
	opening_balance: number;
	total_income: number;
	total_expense: number;
	current_balance: number;
	closing_balance: number | null;
	is_closed: boolean;
	transaction_count: number;
}

interface CashBoxSummaryCardProps {
	summary: CashBoxSummary;
}

export function CashBoxSummaryCard({ summary }: CashBoxSummaryCardProps) {
	return (
		<div className="grid gap-4 md:grid-cols-4">
			<Card className="p-6 bg-card border-border">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm font-medium text-muted-foreground">Saldo Inicial</p>
						<p className="text-xl font-bold text-foreground mt-2">
							{formatCurrency(summary.opening_balance)}
						</p>
					</div>
					<div className="rounded-lg bg-secondary p-3 text-chart-1">
						<Wallet className="h-5 w-5" />
					</div>
				</div>
			</Card>

			<Card className="p-6 bg-card border-border">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm font-medium text-muted-foreground">Total Ingresos</p>
						<p className="text-xl font-bold text-green-500 mt-2">
							{formatCurrency(summary.total_income)}
						</p>
					</div>
					<div className="rounded-lg bg-green-500/10 p-3 text-green-500">
						<ArrowUpCircle className="h-5 w-5" />
					</div>
				</div>
			</Card>

			<Card className="p-6 bg-card border-border">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm font-medium text-muted-foreground">Total Egresos</p>
						<p className="text-xl font-bold text-red-500 mt-2 wrap">
							{formatCurrency(summary.total_expense)}
						</p>
					</div>
					<div className="rounded-lg bg-red-500/10 p-3 text-red-500">
						<ArrowDownCircle className="h-5 w-5" />
					</div>
				</div>
			</Card>

			<Card className="p-6 bg-card border-border">
				<div className="flex items-center justify-between min-w-0">
					<div>
						<p className="text-sm font-medium text-muted-foreground">Saldo Actual</p>
						<p className="text-xl font-bold text-foreground mt-2 whitespace-normal break-all">
							{formatCurrency(summary.current_balance)}
						</p>
					</div>
					<div className="rounded-lg bg-secondary p-3 text-chart-1">
						<DollarSign className="h-5 w-5" />
					</div>
				</div>
			</Card>
		</div>
	);
}
