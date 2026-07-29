import { Trash2, Edit, ImageIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { BalanceTransaction } from '@/lib/balances/balance_transactions';
import { formatCurrency, formatCurrencyUSD } from '@/utils/formats-money';
import { getPaymentMethodLabel } from '@/constants/balances/payment_methods';

interface TransactionsTableProps {
	isLoading: boolean;
	transactions: BalanceTransaction[];
	formatDate: (dateStr: string | null | undefined) => string;
	onDeleteTransaction: (transaction: BalanceTransaction) => void;
	onEditTransaction: (transaction: BalanceTransaction) => void;
	onViewFiles: (transaction: BalanceTransaction) => void;
}

export function TransactionsTable({
	isLoading,
	transactions,
	formatDate,
	onDeleteTransaction,
	onEditTransaction,
	onViewFiles,
}: TransactionsTableProps) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Fecha</TableHead>
					<TableHead className="text-center">Metodo de pago</TableHead>
					<TableHead className="text-center w-[200px]">Observaciones</TableHead>
					<TableHead className="text-center">Monto pesos/USD</TableHead>
					<TableHead className="text-center">Cotizacion USD</TableHead>
					<TableHead className="text-center">Acción</TableHead>
					<TableHead className="text-center">Archivos</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{isLoading ? (
					<TableRow>
						<TableCell colSpan={7} className="text-center text-muted-foreground">
							Cargando transacciones...
						</TableCell>
					</TableRow>
				) : transactions.length === 0 ? (
					<TableRow>
						<TableCell colSpan={7} className="text-center text-muted-foreground">
							No hay transacciones registradas
						</TableCell>
					</TableRow>
				) : (
					transactions.map((transaction) => (
						<TableRow key={transaction.id}>
							<TableCell>{formatDate(transaction.date)}</TableCell>
							<TableCell className="text-center font-sm">
								{getPaymentMethodLabel(transaction.payment_method || '')}
							</TableCell>
							<TableCell className="text-center font-sm w-[200px] whitespace-normal break-words">
								<div className="flex items-center gap-1 justify-center">
									{transaction.is_extra_amount && (
										<span className="inline-flex items-center gap-0.5 text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-sm">
											<Plus className="h-3 w-3" />
											Extra
										</span>
									)}
									<span>{transaction.notes}</span>
								</div>{' '}
							</TableCell>
							<TableCell className="text-center font-sm">
								<div className="flex flex-col">
									<span>{formatCurrency(transaction.amount)}</span>
									<span className="text-muted-foreground text-xs">
										{formatCurrencyUSD(transaction.usd_amount)}
									</span>
								</div>
							</TableCell>
							<TableCell className="text-center font-sm">
								{formatCurrency(transaction.quote_usd)}
							</TableCell>
							<TableCell className="text-center">
								<div className="flex items-center justify-center gap-1">
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
										onClick={() => onEditTransaction(transaction)}
										aria-label={`Editar transacción del ${formatDate(transaction.date)}`}
									>
										<Edit className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
										onClick={() => onDeleteTransaction(transaction)}
										aria-label={`Eliminar transacción del ${formatDate(transaction.date)}`}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</TableCell>
							<TableCell className="text-center">
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
									onClick={() => onViewFiles(transaction)}
									aria-label="Ver archivos"
								>
									<ImageIcon className="h-4 w-4" />
								</Button>
							</TableCell>
						</TableRow>
					))
				)}
			</TableBody>
		</Table>
	);
}
