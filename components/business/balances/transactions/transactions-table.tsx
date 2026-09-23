import { Trash2, Edit, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { BalanceTransactionWithBankAccount } from '@/lib/balances/balance_transactions';
import { formatCurrency, formatCurrencyUSD } from '@/utils/formats-money';
import { getPaymentMethodLabel } from '@/constants/balances/payment_methods';

interface TransactionsTableProps {
	isLoading: boolean;
	transactions: BalanceTransactionWithBankAccount[];
	formatDate: (dateStr: string | null | undefined) => string;
	onDeleteTransaction: (transaction: BalanceTransactionWithBankAccount) => void;
	onEditTransaction: (transaction: BalanceTransactionWithBankAccount) => void;
	onViewFiles: (transaction: BalanceTransactionWithBankAccount) => void;
}

export function TransactionsTable({
	isLoading,
	transactions,
	formatDate,
	onDeleteTransaction,
	onEditTransaction,
	onViewFiles,
}: TransactionsTableProps) {
	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
				Cargando transacciones...
			</div>
		);
	}

	if (transactions.length === 0) {
		return (
			<div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
				No hay transacciones registradas
			</div>
		);
	}

	return (
		<>
			{/* Desktop */}
			<div className="hidden md:block">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Fecha</TableHead>
							<TableHead className="text-center">Método de pago</TableHead>
							<TableHead className="w-[200px] text-center">Observaciones</TableHead>
							<TableHead className="text-center">Monto pesos/USD</TableHead>
							<TableHead className="text-center">Cotización USD</TableHead>
							<TableHead className="text-center">Acción</TableHead>
							<TableHead className="text-center">Archivos</TableHead>
						</TableRow>
					</TableHeader>

					<TableBody>
						{transactions.map((transaction) => (
							<TableRow key={transaction.id}>
								<TableCell>{formatDate(transaction.date)}</TableCell>

								<TableCell className="text-center whitespace-normal break-words">
									{getPaymentMethodLabel(transaction.payment_method || '')}

									{transaction.bank_account_id && transaction.bank_account ? (
										<div className="text-xs text-muted-foreground">
											{transaction.bank_account.name} - {transaction.bank_account.bank}
										</div>
									) : null}
								</TableCell>

								<TableCell className="w-[200px] text-center whitespace-normal break-words">
									{transaction.notes || '-'}
								</TableCell>

								<TableCell className="text-center">
									<div className="flex flex-col">
										<span>{formatCurrency(transaction.amount)}</span>
										<span className="text-xs text-muted-foreground">
											{formatCurrencyUSD(transaction.usd_amount)}
										</span>
									</div>
								</TableCell>

								<TableCell className="text-center">
									{formatCurrency(transaction.quote_usd)}
								</TableCell>

								<TableCell>
									<div className="flex items-center justify-center gap-1">
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary"
											onClick={() => onEditTransaction(transaction)}
											aria-label="Editar transacción"
										>
											<Edit className="h-4 w-4" />
										</Button>

										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
											onClick={() => onDeleteTransaction(transaction)}
											aria-label="Eliminar transacción"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</TableCell>

								<TableCell>
									<div className="flex justify-center">
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary"
											onClick={() => onViewFiles(transaction)}
											aria-label="Ver archivos"
										>
											<ImageIcon className="h-4 w-4" />
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{/* Mobile */}
			<div className="space-y-3 p-3 md:hidden">
				{transactions.map((transaction) => (
					<div key={transaction.id} className="rounded-xl border bg-card p-4 shadow-sm">
						{/* Header */}
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<p className="text-sm font-medium text-muted-foreground">
									{formatDate(transaction.date)}
								</p>

								<p className="mt-1 text-lg font-semibold">{formatCurrency(transaction.amount)}</p>

								<p className="text-xs text-muted-foreground">
									{formatCurrencyUSD(transaction.usd_amount)}
								</p>
							</div>

							<div className="flex shrink-0 items-center gap-1">
								<Button
									variant="ghost"
									size="icon"
									className="h-9 w-9 text-muted-foreground hover:bg-primary/10 hover:text-primary"
									onClick={() => onViewFiles(transaction)}
									aria-label="Ver archivos"
								>
									<ImageIcon className="h-4 w-4" />
								</Button>

								<Button
									variant="ghost"
									size="icon"
									className="h-9 w-9 text-muted-foreground hover:bg-primary/10 hover:text-primary"
									onClick={() => onEditTransaction(transaction)}
									aria-label="Editar transacción"
								>
									<Edit className="h-4 w-4" />
								</Button>

								<Button
									variant="ghost"
									size="icon"
									className="h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
									onClick={() => onDeleteTransaction(transaction)}
									aria-label="Eliminar transacción"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						</div>

						{/* Details */}
						<div className="mt-4 space-y-3 border-t pt-3">
							<div>
								<p className="text-xs font-medium text-muted-foreground">Método de pago</p>

								<p className="mt-0.5 text-sm">
									{getPaymentMethodLabel(transaction.payment_method || '')}
								</p>

								{transaction.bank_account_id && transaction.bank_account ? (
									<p className="text-xs text-muted-foreground">
										{transaction.bank_account.name} - {transaction.bank_account.bank}
									</p>
								) : null}
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<p className="text-xs font-medium text-muted-foreground">Cotización USD</p>
									<p className="mt-0.5 text-sm">{formatCurrency(transaction.quote_usd)}</p>
								</div>

								{transaction.notes ? (
									<div className="min-w-0">
										<p className="text-xs font-medium text-muted-foreground">Observaciones</p>
										<p className="mt-0.5 break-words text-sm">{transaction.notes}</p>
									</div>
								) : null}
							</div>
						</div>
					</div>
				))}
			</div>
		</>
	);
}
