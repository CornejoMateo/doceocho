'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, FileText, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BudgetWithWork } from '@/lib/balances/balances';
import { BudgetFolderVM } from '@/components/business/reports/budgets/types';
import { formatCurrency, formatCurrencyUSD } from '@/utils/formats-money';
import { formatCreatedAt } from '@/utils/format-date';
import {
	getBudgetStatus,
	BUDGET_STATUS_COLORS,
	BUDGET_STATUS_LABELS,
} from '@/constants/budgets/budget-status';

interface BudgetCardProps {
	budget: BudgetWithWork;
	folder: BudgetFolderVM;
	isLoading: boolean;
	onChooseBudget: (budgetId: number) => void;
	onDeleteBudget: (budgetId: number) => void;
	onViewPdf: (budget: BudgetWithWork) => void;
	onOpenDetail: (budget: BudgetWithWork) => void;
}

export function BudgetCard({
	budget,
	folder,
	isLoading,
	onChooseBudget,
	onDeleteBudget,
	onViewPdf,
	onOpenDetail,
}: BudgetCardProps) {
	const isChosen = !!budget.accepted;

	return (
		<Card
			className={cn(
				'w-full sm:w-fit sm:min-w-[340px] max-w-full p-4 pb-10 border-border relative cursor-pointer hover:shadow-md transition-shadow',
				isChosen && 'border-primary bg-primary/5'
			)}
			onClick={() => onOpenDetail(budget)}
		>
			<div className="flex justify-between items-start gap-2 mb-4">
				<div className="space-y-2">
					{isChosen ? (
						<Badge className="gap-1 mt-2 mb-4" variant="secondary">
							<CheckCircle className="h-3.5 w-3.5" /> Elegido
						</Badge>
					) : null}

					<div className="space-y-1 pr-2">
						{budget.number ? <Badge variant="outline">#{budget.number}</Badge> : null}

						<p className="text-sm font-semibold text-foreground">
							{formatCurrency(budget.amount_ars)}
						</p>
						<p className="text-sm font-semibold text-foreground">
							{formatCurrencyUSD(budget.amount_usd)}
						</p>
					</div>
					{budget.created_at && (
						<p className="text-xs text-muted-foreground">{formatCreatedAt(budget.created_at)}</p>
					)}
				</div>
				<Button
					variant="ghost"
					size="sm"
					onClick={(e) => {
						e.stopPropagation();
						onDeleteBudget(budget.id);
					}}
					disabled={isLoading}
					className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9 sm:h-8 sm:w-8 p-0"
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>

			<div className="mt-auto flex flex-col gap-2 pt-4">
				{budget.pdf_path ? (
					<Button
						variant="outline"
						size="sm"
						onClick={(e) => {
							e.stopPropagation();
							onViewPdf(budget);
						}}
						className="w-full gap-2"
					>
						<FileText className="h-4 w-4" />
						Ver PDF
					</Button>
				) : (
					<div className="flex h-9 w-full items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
						Sin PDF
					</div>
				)}

				<Button
					variant={isChosen ? 'secondary' : 'default'}
					size="sm"
					disabled={isLoading}
					onClick={(e) => {
						e.stopPropagation();
						onChooseBudget(budget.id);
					}}
					className="w-full gap-2"
				>
					<CheckCircle className="h-4 w-4" />
					{isChosen ? 'Elegido' : 'Elegir'}
				</Button>
			</div>

			{(() => {
				const currentStatus = getBudgetStatus(budget);

				return (
					<div
						className={cn(
							'absolute bottom-0 left-0 right-0 text-white text-xs font-semibold py-1 text-center rounded-b-lg',
							BUDGET_STATUS_COLORS[currentStatus as keyof typeof BUDGET_STATUS_COLORS] ||
								'bg-gray-500'
						)}
					>
						{BUDGET_STATUS_LABELS[currentStatus as keyof typeof BUDGET_STATUS_LABELS]}
					</div>
				);
			})()}
		</Card>
	);
}
