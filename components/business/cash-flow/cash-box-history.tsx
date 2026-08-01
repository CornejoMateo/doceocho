'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, Eye, ChevronUp } from 'lucide-react';
import { CashBox, getCashBoxWithTransactions } from '@/lib/cash-flow/cash-flow';
import { formatCurrency } from '@/utils/formats-money';
import { formatCreatedAt, formatTime } from '@/utils/format-date';
import { translateError } from '@/lib/error-translator';
import { toast } from '@/components/ui/use-toast';
import { getExpenseCategoryLabel } from '@/constants/cashflow/cashflow';
import { getPaymentMethodLabel } from '@/constants/balances/payment_methods';

interface CashBoxHistoryProps {
	cashBoxes: CashBox[];
	loading: boolean;
	onRefresh: () => void;
}

interface CashBoxWithTransactions extends CashBox {
	transactions?: any[];
	showTransactions?: boolean;
	totalIncome?: number;
	totalExpense?: number;
}

export function CashBoxHistory({ cashBoxes, loading, onRefresh }: CashBoxHistoryProps) {
	const [expandedBoxes, setExpandedBoxes] = useState<Set<number>>(new Set());
	const [boxesWithTransactions, setBoxesWithTransactions] = useState<CashBoxWithTransactions[]>([]);
	const [loadingBoxId, setLoadingBoxId] = useState<number | null>(null);

	const ITEMS_PER_PAGE = 6;

	const [currentPage, setCurrentPage] = useState(1);
	const loadTransactions = async (boxId: number) => {
		setLoadingBoxId(boxId);
		try {
			const { data, error } = await getCashBoxWithTransactions(boxId);

			if (error) throw error;

			const transactions = data?.transactions ?? [];

			const totalIncome = transactions
				.filter((t) => t.type === 'income')
				.reduce((sum, t) => sum + Number(t.amount), 0);

			const totalExpense = transactions
				.filter((t) => t.type === 'expense')
				.reduce((sum, t) => sum + Number(t.amount), 0);

			setBoxesWithTransactions((prev) =>
				prev.map((box) =>
					box.id === boxId
						? {
								...box,
								transactions,
								totalIncome,
								totalExpense,
							}
						: box
				)
			);
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error),
				variant: 'destructive',
			});
		} finally {
			setLoadingBoxId(null);
		}
	};

	const toggleExpand = async (box: CashBoxWithTransactions) => {
		const newExpanded = new Set(expandedBoxes);

		if (newExpanded.has(box.id)) {
			newExpanded.delete(box.id);
			setExpandedBoxes(newExpanded);
			return;
		}

		newExpanded.add(box.id);
		setExpandedBoxes(newExpanded);

		const loadedBox = boxesWithTransactions.find((b) => b.id === box.id);

		if (!loadedBox?.transactions) {
			loadTransactions(box.id);
		}
	};

	const closedBoxes = cashBoxes.filter((box) => box.is_closed);

	const totalPages = Math.ceil(closedBoxes.length / ITEMS_PER_PAGE);

	const paginatedBoxes = closedBoxes.slice(
		(currentPage - 1) * ITEMS_PER_PAGE,
		currentPage * ITEMS_PER_PAGE
	);

	useEffect(() => {
		setBoxesWithTransactions((prev) =>
			cashBoxes.map((box) => {
				const cached = prev.find((b) => b.id === box.id);
				return cached ? { ...cached, ...box } : box;
			})
		);
	}, [cashBoxes]);

	useEffect(() => {
		setCurrentPage(1);
	}, [closedBoxes.length]);

	if (loading) {
		return (
			<Card className="p-12 bg-card border-border text-center">
				<p className="text-muted-foreground">Cargando historial...</p>
			</Card>
		);
	}

	if (closedBoxes.length === 0) {
		return (
			<Card className="p-12 bg-card border-border text-center">
				<div className="flex flex-col items-center gap-4">
					<div className="rounded-full bg-secondary p-4">
						<History className="h-8 w-8 text-muted-foreground" />
					</div>
					<div>
						<h3 className="text-lg font-semibold text-foreground">Sin historial</h3>
						<p className="text-muted-foreground mt-1">No hay cajas cerradas en el historial</p>
					</div>
				</div>
			</Card>
		);
	}

	return (
		<div className="space-y-4 overflow-y-auto max-h-[500px] pr-2">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold text-foreground">Historial de Cajas</h3>
				<Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
					<History className="h-4 w-4" />
					Actualizar
				</Button>
			</div>

			{paginatedBoxes.map((box) => {
				const isLoadingTransactions = loadingBoxId === box.id;
				const loadedBox = boxesWithTransactions.find((b) => b.id === box.id);
				const totalIncome = loadedBox?.totalIncome ?? 0;
				const totalExpense = loadedBox?.totalExpense ?? 0;

				const isExpanded = expandedBoxes.has(box.id);
				return (
					<Card key={box.id} className="bg-card border-border">
						<div className="p-6">
							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
								<div className="flex items-center gap-4 min-w-0">
									<div className="rounded-full bg-secondary p-3 flex-shrink-0">
										<History className="h-5 w-5 text-muted-foreground" />
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2 flex-wrap">
											<h4 className="font-semibold text-foreground truncate">
												{formatCreatedAt(box.created_at) + ' - ' + formatCreatedAt(box.closed_at)}
											</h4>
											<Badge variant="secondary">Cerrada</Badge>
										</div>
										<p className="text-sm text-muted-foreground mt-1 truncate">
											Saldo final: {formatCurrency(Number(box.closing_balance) || 0)}
										</p>
									</div>
								</div>
								<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
									<div className="flex gap-3 flex-wrap">
										{loadedBox?.transactions && loadedBox.transactions.length > 0 && (
											<>
												<div className="rounded-lg bg-green-500/10 px-3 py-2">
													<p className="text-xs text-muted-foreground">Ingresos</p>
													<p className="font-semibold text-green-600">
														{formatCurrency(totalIncome)}
													</p>
												</div>

												<div className="rounded-lg bg-red-500/10 px-3 py-2">
													<p className="text-xs text-muted-foreground">Egresos</p>
													<p className="font-semibold text-red-600">
														{formatCurrency(totalExpense)}
													</p>
												</div>
											</>
										)}
									</div>

									<Button
										variant="outline"
										size="sm"
										onClick={() => toggleExpand(box)}
										className="gap-2 sm:ml-auto"
									>
										{isExpanded ? (
											isLoadingTransactions ? (
												<>
													<div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
													Cargando detalles de caja...
												</>
											) : (
												<>
													<ChevronUp className="h-4 w-4" />
													Ocultar
												</>
											)
										) : (
											<>
												<Eye className="h-4 w-4" />
												Ver movimientos
											</>
										)}
									</Button>
								</div>
							</div>

							{isExpanded && loadedBox?.transactions && !isLoadingTransactions && (
								<div className="mt-4 pt-4 border-t space-y-2">
									{loadedBox.transactions.length === 0 && (
										<p className="text-center text-muted-foreground py-8">
											No hay movimientos registrados en esta caja
										</p>
									)}

									{loadedBox.transactions.map((transaction: any) => (
										<div
											key={transaction.id}
											className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 text-sm"
										>
											<div className="flex items-center gap-3">
												<span
													className={
														transaction.type === 'income' ? 'text-green-500' : 'text-red-500'
													}
												>
													{transaction.type === 'income' ? '+' : '-'}
												</span>

												<div className="flex flex-col">
													{transaction.description && (
														<span className="text-foreground">{transaction.description}</span>
													)}

													<span className="text-muted-foreground">
														{transaction.type === 'income'
															? getPaymentMethodLabel(transaction.category)
															: getExpenseCategoryLabel(transaction.category)}
														{transaction.category === 'bank_transfer' &&
															transaction.bank_account && (
																<>
																	{' '}
																	({transaction.bank_account.bank} - {transaction.bank_account.name}
																	){' '}
																</>
															)}
													</span>

													<span className="text-xs text-muted-foreground">
														{formatCreatedAt(transaction.created_at)} •{' '}
														{formatTime(transaction.created_at)}
													</span>
												</div>
											</div>
											<span className="font-medium text-foreground">
												{formatCurrency(Number(transaction.amount))}
											</span>
										</div>
									))}
								</div>
							)}
						</div>
					</Card>
				);
			})}
			{totalPages > 1 && (
				<div className="flex items-center justify-between pt-2">
					<p className="text-sm text-muted-foreground">
						Página {currentPage} de {totalPages}
					</p>

					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setCurrentPage((p) => p - 1)}
							disabled={currentPage === 1}
						>
							Anterior
						</Button>

						<Button
							variant="outline"
							size="sm"
							onClick={() => setCurrentPage((p) => p + 1)}
							disabled={currentPage === totalPages}
						>
							Siguiente
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
