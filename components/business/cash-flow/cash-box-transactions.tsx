'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUpCircle, ArrowDownCircle, Trash2, Search } from 'lucide-react';
import { TransactionWithBankAccount } from '@/lib/cash-flow/cash-flow';
import { formatCurrency } from '@/utils/formats-money';
import { formatCreatedAt, formatCreatedAtChat } from '@/utils/format-date';
import { getPaymentMethodLabel } from '@/constants/balances/payment_methods';
import { getExpenseCategoryLabel } from '@/constants/cashflow/cashflow';

export function CashBoxTransactions({
	transactions,
	cashBoxCreatedAt,
	onDeleteTransaction,
}: {
	transactions: TransactionWithBankAccount[];
	cashBoxCreatedAt: string;
	onDeleteTransaction: (transaction: TransactionWithBankAccount) => void;
}) {
	const [searchTerm, setSearchTerm] = useState<string>('');

	const filteredTransactions = transactions.filter((transaction) => {
		if (!searchTerm) return true;

		const searchLower = searchTerm.toLowerCase();
		const description = transaction.description?.toLowerCase() || '';
		const category = transaction.category?.toLowerCase() || '';
		const paymentMethod = transaction.category
			? transaction.type === 'income'
				? getPaymentMethodLabel(transaction.category).toLowerCase()
				: getExpenseCategoryLabel(transaction.category).toLowerCase()
			: '';

		return (
			description.includes(searchLower) ||
			category.includes(searchLower) ||
			paymentMethod.includes(searchLower)
		);
	});

	return (
		<Card className="bg-card border-border">
			<div className="p-6 overflow-y-auto max-h-[400px]">
				<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<h3 className="text-base font-semibold text-foreground">
						Movimientos correspondientes a la caja actual
					</h3>

					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								type="text"
								placeholder="Buscar por descripción, método de pago..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full sm:w-64 pl-10"
							/>
						</div>
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<span>Caja del {formatCreatedAt(cashBoxCreatedAt)}</span>
						</div>
					</div>
				</div>
				{filteredTransactions.length === 0 ? (
					<p className="text-muted-foreground text-center py-8 text-sm">
						{searchTerm
							? 'No se encontraron movimientos que coincidan con la búsqueda'
							: 'No hay movimientos registrados para la caja actual. Agrega ingresos o egresos para verlos aquí.'}
					</p>
				) : (
					<div className="space-y-3">
						{filteredTransactions.map((transaction) => (
							<div
								key={transaction.id}
								className="flex flex-col gap-3 p-4 rounded-lg bg-secondary/50 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="flex items-center gap-4">
									<div
										className={`rounded-full p-2 ${
											transaction.type === 'income'
												? 'bg-green-100/10 text-green-900'
												: 'bg-red-500/10 text-red-500'
										}`}
									>
										{transaction.type === 'income' ? (
											<ArrowUpCircle className="h-5 w-5" />
										) : (
											<ArrowDownCircle className="h-5 w-5" />
										)}
									</div>
									<div>
										<p className="text-sm text-muted-foreground">
											{transaction.category
												? transaction.type === 'income'
													? getPaymentMethodLabel(transaction.category)
													: getExpenseCategoryLabel(transaction.category)
												: ''}{' '}
											{transaction.bank_account
												? ` - (${transaction.bank_account.bank} - ${transaction.bank_account.name})`
												: ''}
										</p>
										<p className="font-medium text-foreground">
											{transaction.description ? transaction.description : ''}
										</p>
										<p className="text-xs text-muted-foreground">
											{formatCreatedAtChat(transaction.created_at)}
										</p>
									</div>
								</div>
								<div className="flex items-center justify-between w-full sm:w-auto gap-4">
									<p
										className={`font-semibold ${
											transaction.type === 'income' ? 'text-green-800' : 'text-red-500'
										}`}
									>
										{transaction.type === 'income' ? '+' : '-'}
										{formatCurrency(Number(transaction.amount))}
									</p>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => onDeleteTransaction(transaction)}
										className="text-destructive hover:text-destructive"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</Card>
	);
}
