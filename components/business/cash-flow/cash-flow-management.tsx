'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';
import {
	DollarSign,
	ArrowUpCircle,
	ArrowDownCircle,
	Plus,
	RefreshCw,
	Building2,
	Trash2,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
	CashBox,
	CashBoxSummary,
	Transaction,
	TransactionWithBankAccount,
	BankAccount,
	listCashBoxes,
	createCashBox,
	closeCashBox,
	deleteTransaction,
	listActiveBankAccounts,
	listTransactions,
} from '@/lib/cash-flow/cash-flow';
import { CashBoxSummaryCard } from '@/components/business/cash-flow/cash-box-summary-card';
import { TransactionDialog } from '@/components/business/cash-flow/transaction-dialog';
import { CashBoxHistory } from '@/components/business/cash-flow/cash-box-history';
import { BankAccountsDialog } from '@/components/business/cash-flow/bank-accounts-dialog';
import { CloseCashBoxDialog } from '@/components/business/cash-flow/close-cash-box-dialog';
import { formatCurrency } from '@/utils/formats-money';
import { translateError } from '@/lib/error-translator';
import { getPaymentMethodLabel } from '@/constants/balances/payment_methods';
import { getExpenseCategoryLabel } from '@/constants/cashflow/cashflow';

function CashFlowTransactionsRealtime({
	cashBoxId,
	onTransactionsChange,
}: {
	cashBoxId: number;
	onTransactionsChange: (transactions: TransactionWithBankAccount[]) => void;
	onRefreshReady?: (refresh: (() => Promise<void>) | null) => void;
}) {
	const { data, refresh } = useOptimizedRealtime<TransactionWithBankAccount>(
		'transactions_box',
		async () => {
			const { data } = await listTransactions(cashBoxId);
			return data ?? [];
		},
		`cash-flow-transactions_${cashBoxId}`
	);

	useEffect(() => {
		onTransactionsChange(data);
	}, [data, onTransactionsChange]);

	return null;
}

export function CashFlowManagement() {
	const { toast } = useToast();
	const [activeTab, setActiveTab] = useState('current');

	const [openCashBox, setOpenCashBox] = useState<CashBox | null>(null);
	const {
		data: cashBoxes,
		loading: loadingCashBoxes,
		refresh: refreshCashBoxes,
	} = useOptimizedRealtime<CashBox>(
		'cash_boxes',
		async () => {
			const { data } = await listCashBoxes();
			return data ?? [];
		},
		'cash_boxes_cache'
	);
	const {
		data: bankAccounts,
		loading: loadingBankAccounts,
		refresh: refreshBankAccounts,
	} = useOptimizedRealtime<BankAccount>(
		'bank_accounts',
		async () => {
			const { data } = await listActiveBankAccounts();
			return data ?? [];
		},
		'active_bank_accounts_cache'
	);

	const [transactions, setTransactions] = useState<TransactionWithBankAccount[]>([]);
	const refreshTransactionsRef = useRef<(() => Promise<void>) | null>(null);
	const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
	const [isBankAccountsDialogOpen, setIsBankAccountsDialogOpen] = useState(false);
	const [isCloseCashBoxDialogOpen, setIsCloseCashBoxDialogOpen] = useState(false);
	const [isDeleteTransactionDialogOpen, setIsDeleteTransactionDialogOpen] = useState(false);
	const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
	const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');

	useEffect(() => {
		const nextOpenCashBox = cashBoxes.find((cashBox) => !cashBox.is_closed) ?? null;
		setOpenCashBox(nextOpenCashBox);
	}, [cashBoxes]);

	const cashBoxSummary = useMemo<CashBoxSummary | null>(() => {
		if (!openCashBox) return null;

		const totalIncome = transactions
			.filter((transaction) => transaction.type === 'income')
			.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
		const totalExpense = transactions
			.filter((transaction) => transaction.type === 'expense')
			.reduce((sum, transaction) => sum + Number(transaction.amount), 0);

		return {
			id: openCashBox.id,
			date: openCashBox.date,
			opening_balance: Number(openCashBox.opening_balance),
			total_income: totalIncome,
			total_expense: totalExpense,
			current_balance: Number(openCashBox.opening_balance) + totalIncome - totalExpense,
			closing_balance: openCashBox.closing_balance ? Number(openCashBox.closing_balance) : null,
			is_closed: openCashBox.is_closed,
			transaction_count: transactions.length,
		};
	}, [openCashBox, transactions]);

	const handleCreateCashBox = async () => {
		try {
			const now = new Date();
			now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
			const today = now.toISOString().split('T')[0];
			const { data, error } = await createCashBox({
				date: today,
				opening_balance: 0,
				closing_balance: null,
				is_closed: false,
				closed_at: null,
				notes: null,
			});
			if (error) throw error;
			toast({
				title: 'Caja creada',
				description: 'Se ha creado una nueva caja para hoy.',
			});
			await refreshCashBoxes();
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo crear la caja.',
				variant: 'destructive',
			});
		}
	};

	const handleAddTransaction = (type: 'income' | 'expense') => {
		setTransactionType(type);
		setIsTransactionDialogOpen(true);
	};

	const handleTransactionCreated = async () => {
		setIsTransactionDialogOpen(false);
		await refreshTransactionsRef.current?.();
	};

	const handleAskDeleteTransaction = (transaction: Transaction) => {
		setTransactionToDelete(transaction);
		setIsDeleteTransactionDialogOpen(true);
	};

	const handleDeleteTransaction = async () => {
		if (!transactionToDelete) return;
		try {
			const { error } = await deleteTransaction(transactionToDelete.id);
			if (error) throw error;
			toast({
				title: 'Transacción eliminada',
				description: 'La transacción ha sido eliminada correctamente.',
			});
			setIsDeleteTransactionDialogOpen(false);
			setTransactionToDelete(null);
			await refreshTransactionsRef.current?.();
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo eliminar la transacción.',
				variant: 'destructive',
			});
		}
	};

	const handleCloseCashBox = async (closingBalance: number, notes?: string) => {
		if (!openCashBox?.id) return;
		try {
			const { error } = await closeCashBox(openCashBox.id, closingBalance, notes);
			if (error) throw error;
			toast({
				title: 'Caja cerrada',
				description: 'La caja ha sido cerrada correctamente.',
			});
			setIsCloseCashBoxDialogOpen(false);
			await refreshCashBoxes();
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo cerrar la caja.',
				variant: 'destructive',
			});
		}
	};

	const handleBankAccountsUpdated = async () => {
		setIsBankAccountsDialogOpen(false);
		await refreshBankAccounts();
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h2 className="text-2xl font-bold text-foreground text-balance">Flujo de Fondos</h2>
					<p className="text-muted-foreground mt-1">Gestión de ingresos, egresos y cajas diarias</p>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={() => setIsBankAccountsDialogOpen(true)}
						className="gap-2"
					>
						<Building2 className="h-4 w-4" />
						Cuentas Bancarias
					</Button>
				</div>
			</div>

			<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
				<TabsList>
					<TabsTrigger value="current">Caja Actual</TabsTrigger>
					<TabsTrigger value="history">Historial</TabsTrigger>
				</TabsList>

				<TabsContent value="current" className="space-y-6">
					{!openCashBox ? (
						<Card className="p-12 bg-card border-border text-center">
							<div className="flex flex-col items-center gap-4">
								<div className="rounded-full bg-secondary p-4">
									<DollarSign className="h-8 w-8 text-muted-foreground" />
								</div>
								<div>
									<h3 className="text-lg font-semibold text-foreground">No hay caja abierta</h3>
									<p className="text-muted-foreground mt-1">
										Crea una nueva caja para comenzar a registrar movimientos
									</p>
								</div>
								<Button onClick={handleCreateCashBox} className="gap-2">
									<Plus className="h-4 w-4" />
									Crear Caja
								</Button>
							</div>
						</Card>
					) : (
						<>
							{/* Summary Card */}
							{cashBoxSummary && <CashBoxSummaryCard summary={cashBoxSummary} />}

							{/* Action Buttons */}
							<div className="grid gap-4 md:grid-cols-2">
								<Button onClick={() => handleAddTransaction('income')} className="gap-2 h-12">
									<ArrowUpCircle className="h-5 w-5" />
									Registrar Ingreso
								</Button>
								<Button
									onClick={() => handleAddTransaction('expense')}
									variant="outline"
									className="gap-2 h-12"
								>
									<ArrowDownCircle className="h-5 w-5" />
									Registrar Egreso
								</Button>
							</div>

							{/* Close Cash Box Button */}
							<div className="flex w-full justify-end">
								<Button
									onClick={() => setIsCloseCashBoxDialogOpen(true)}
									variant="destructive"
									className="w-full gap-2 md:w-auto"
								>
									<RefreshCw className="" />
									Cerrar y Reiniciar Caja
								</Button>
							</div>

							{/* Transactions List */}
							<Card className="bg-card border-border">
								<div className="p-6">
									<h3 className="text-lg font-semibold text-foreground mb-4">
										Movimientos del día
									</h3>
									{transactions.length === 0 ? (
										<p className="text-muted-foreground text-center py-8">
											No hay movimientos registrados hoy
										</p>
									) : (
										<div className="space-y-3">
											{transactions.map((transaction) => (
												<div
													key={transaction.id}
													className="flex flex-col gap-3 p-4 rounded-lg bg-secondary/50 sm:flex-row sm:items-center sm:justify-between"
												>
													<div className="flex items-center gap-4">
														<div
															className={`rounded-full p-2 ${
																transaction.type === 'income'
																	? 'bg-green-500/10 text-green-500'
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
																	: ''}
															</p>
															<p className="font-medium text-foreground">
																{transaction.description ? transaction.description : ''}
															</p>
														</div>
													</div>
													<div className="flex items-center justify-between w-full sm:w-auto gap-4">
														<p
															className={`font-semibold ${
																transaction.type === 'income' ? 'text-green-500' : 'text-red-500'
															}`}
														>
															{transaction.type === 'income' ? '+' : '-'}
															{formatCurrency(Number(transaction.amount))}
														</p>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => handleAskDeleteTransaction(transaction)}
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
						</>
					)}
				</TabsContent>

				<TabsContent value="history">
					<CashBoxHistory
						cashBoxes={cashBoxes}
						loading={loadingCashBoxes}
						onRefresh={refreshCashBoxes}
					/>
				</TabsContent>
			</Tabs>

			{/* Dialogs */}
			<TransactionDialog
				open={isTransactionDialogOpen}
				onOpenChange={setIsTransactionDialogOpen}
				type={transactionType}
				cashBoxId={openCashBox?.id || 0}
				bankAccounts={bankAccounts}
				onTransactionCreated={handleTransactionCreated}
			/>

			{openCashBox?.id && (
				<CashFlowTransactionsRealtime
					key={openCashBox.id}
					cashBoxId={openCashBox.id}
					onTransactionsChange={setTransactions}
					onRefreshReady={(refresh) => {
						refreshTransactionsRef.current = refresh;
					}}
				/>
			)}

			<BankAccountsDialog
				open={isBankAccountsDialogOpen}
				onOpenChange={setIsBankAccountsDialogOpen}
				bankAccounts={bankAccounts}
				onBankAccountsUpdated={handleBankAccountsUpdated}
			/>

			<CloseCashBoxDialog
				open={isCloseCashBoxDialogOpen}
				onOpenChange={setIsCloseCashBoxDialogOpen}
				currentBalance={cashBoxSummary?.current_balance || 0}
				onCloseCashBox={handleCloseCashBox}
			/>

			<AlertDialog
				open={isDeleteTransactionDialogOpen}
				onOpenChange={(open) => {
					setIsDeleteTransactionDialogOpen(open);
					if (!open) setTransactionToDelete(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Eliminar transacción?</AlertDialogTitle>
						<AlertDialogDescription>
							Esta acción no se puede deshacer. Se eliminará permanentemente la transacción
							{transactionToDelete && (
								<>
									{' '}
									{transactionToDelete.description ||
										getPaymentMethodLabel(transactionToDelete.category)}
								</>
							)}
							.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteTransaction}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Eliminar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
