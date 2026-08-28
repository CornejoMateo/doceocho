'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Trash2, TrendingUp, StickyNote } from 'lucide-react';
import { formatCurrency, formatCurrencyUSD } from '@/utils/formats-money';
import { BalanceSummary } from '@/helpers/balances/balance-calculations';
import { BalanceWithBudget } from '@/lib/balances/balances';

interface BalanceCardProps {
	balance: BalanceWithBudget & {
		totalPaid?: number;
		totalPaidUSD?: number;
	};
	summary: BalanceSummary;
	onCardClick: () => void;
	onDollarUpdate: () => void;
	onDeleteClick: () => void;
}

export function BalanceCard({ balance, summary, onCardClick, onDeleteClick }: BalanceCardProps) {
	return (
		<Card
			className="hover:shadow-md transition-shadow cursor-pointer relative"
			onClick={onCardClick}
		>
			<Button
				variant="ghost"
				size="icon"
				className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10"
				onClick={(e) => {
					e.stopPropagation();
					onDeleteClick();
				}}
			>
				<Trash2 className="h-4 w-4" />
			</Button>
			<CardContent className="pt-6">
				<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-3">
							<DollarSign className="h-4 w-4 text-primary flex-shrink-0" />
							<span className="font-semibold text-sm">{summary.type}</span>
							{balance.notes && balance.notes.length > 0 && (
								<div title="Tiene notas">
									<StickyNote className="h-3.5 w-3.5 text-yellow-600" />
								</div>
							)}
						</div>
						<div className="text-sm">
							{balance.budget?.folder_budget?.work ? (
								<div>
									<p className="font-medium">
										{balance.budget.folder_budget.work.name ||
											`${balance.budget.folder_budget.work.locality} - ${balance.budget.folder_budget.work.address}`}
									</p>
								</div>
							) : balance.budget ? (
								<div>
									<p className="text-sm">Sin obra asignada</p>
								</div>
							) : null}
						</div>
					</div>

					<div className="flex flex-col gap-3 w-full lg:min-w-[280px] lg:max-w-[340px]">
						<div className="grid grid-cols-3 gap-2 sm:gap-4">
							<div className="flex flex-col">
								<p className="text-[10px] sm:text-xs text-muted-foreground mb-1 truncate">
									Presupuesto
								</p>
								<div className="flex flex-col">
									<p className="text-xs sm:text-sm font-bold text-primary truncate">
										{formatCurrency(summary.effectiveBudgetArs)}
									</p>
									{(summary.budgetUsd > 0 || summary.totalExtraUsd > 0) && (
										<p className="text-[9px] sm:text-xs text-muted-foreground truncate">
											{formatCurrencyUSD(summary.effectiveBudgetUsd)}
										</p>
									)}
								</div>
							</div>
							<div className="flex flex-col">
								<p className="text-[10px] sm:text-xs text-muted-foreground mb-1 truncate">
									Entregado
								</p>
								<div className="flex flex-col">
									<p className="text-xs sm:text-sm font-bold text-green-600 truncate">
										{formatCurrency(balance.totalPaid || 0)}
									</p>
									{balance.contract_date_usd && (
										<p className="text-[9px] sm:text-xs text-muted-foreground truncate">
											{formatCurrencyUSD(summary.totalPaidUsd)}
										</p>
									)}
								</div>
							</div>
							<div className="flex flex-col">
								<p className="text-[10px] sm:text-xs text-muted-foreground mb-1 truncate">Saldo</p>
								<div className="flex flex-col">
									<p className="text-xs sm:text-sm font-bold text-orange-600 truncate">
										{formatCurrency(summary.remainingArs)}
									</p>
									{balance.contract_date_usd && (
										<p className="text-[9px] sm:text-xs text-muted-foreground truncate">
											{formatCurrencyUSD(summary.remainingUsd)}
										</p>
									)}
								</div>
							</div>
						</div>

						{summary.budgetArsCurrent > 0 && (
							<div className="w-full">
								<div className="flex justify-between text-xs text-muted-foreground mb-1">
									<span>Progreso</span>
									<span>{summary.progressPercentage}%</span>
								</div>
								<div className="w-full bg-secondary rounded-full h-2">
									<div
										className="bg-primary rounded-full h-2 transition-all duration-300"
										style={{ width: `${summary.progressPercentage}%` }}
									/>
								</div>
							</div>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
