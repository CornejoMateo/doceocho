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
import { useToast } from '@/components/ui/use-toast';
import {
	CashBox,
	CashBoxSummary,
	TransactionWithBankAccount,
	BankAccount,
	listCashBoxes,
	createCashBox,
	closeCashBox,
	deleteTransaction,
	listBankAccounts,
	listTransactions,
} from '@/lib/cash-flow/cash-flow';
import { TransactionDialog } from '@/components/business/cash-flow/transaction-dialog';
import { BankAccountsTab } from '@/components/business/cash-flow/bank-accounts-tab';
import { CloseCashBoxDialog } from '@/components/business/cash-flow/close-cash-box-dialog';
import { translateError } from '@/lib/error-translator';
import { getPaymentMethodLabel } from '@/constants/balances/payment_methods';
import { getExpenseCategoryLabel } from '@/constants/cashflow/cashflow';
import { OpenCashBoxDialog } from '@/components/business/cash-flow/open-cash-box-dialog';
import { formatCurrency } from '@/utils/formats-money';
import { SuppliersManagement } from '@/components/business/suppliers/suppliers-management';
import { CheckingAccountsTab } from '@/components/business/cash-flow/checking-accounts-tab';
import { SummaryTab } from '@/components/business/cash-flow/summary-tab';
import { CategoriesConfig } from '@/components/business/cash-flow/categories-config';
import { FixedExpensesTab } from '@/components/business/cash-flow/fixed-expenses-tab';
import { IncomesTab } from '@/components/business/cash-flow/incomes-tab';
import { ExpensesTab } from '@/components/business/cash-flow/expenses-tab';
import { CollectionsTab } from '@/components/business/cash-flow/collections-tab';
import { PaymentsTab } from '@/components/business/cash-flow/payments-tab';
import { CASH_FLOW_TABS, CashFlowTabValue } from '@/constants/cashflow/tabs';
import { CATEGORY_TABS } from '@/constants/cashflow/category-tabs';

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
	const [activeTab, setActiveTab] = useState<CashFlowTabValue>('summary');

	const [isOpenCashBoxDialogOpen, setIsOpenCashBoxDialogOpen] = useState(false);

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
			const { data } = await listBankAccounts();
			return data ?? [];
		},
		'all_bank_accounts_cache'
	);
	const activeBankAccounts = useMemo(
		() => bankAccounts.filter((account) => account.is_active),
		[bankAccounts]
	);

	const [transactions, setTransactions] = useState<TransactionWithBankAccount[]>([]);
	const refreshTransactionsRef = useRef<(() => Promise<void>) | null>(null);
	const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
	const [isCloseCashBoxDialogOpen, setIsCloseCashBoxDialogOpen] = useState(false);
	const [isDeleteTransactionDialogOpen, setIsDeleteTransactionDialogOpen] = useState(false);
	const [transactionToDelete, setTransactionToDelete] = useState<TransactionWithBankAccount | null>(
		null
	);
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
			created_at: openCashBox.created_at,
			opening_balance: Number(openCashBox.opening_balance),
			total_income: totalIncome,
			total_expense: totalExpense,
			current_balance: Number(openCashBox.opening_balance) + totalIncome - totalExpense,
			closing_balance: openCashBox.closing_balance ? Number(openCashBox.closing_balance) : null,
			is_closed: openCashBox.is_closed,
			transaction_count: transactions.length,
		};
	}, [openCashBox, transactions]);

	const handleCreateCashBox = async (openingBalance: number) => {
		try {
			const { error } = await createCashBox({
				opening_balance: openingBalance,
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

	const handleAskDeleteTransaction = (transaction: TransactionWithBankAccount) => {
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

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h2 className="text-2xl font-bold text-foreground text-balance">Flujo de Fondos</h2>
					<p className="text-muted-foreground mt-1">Gestión de ingresos, egresos y cajas</p>
				</div>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={(value) => setActiveTab(value as CashFlowTabValue)}
				className="space-y-6"
			>
				<div className="overflow-x-auto">
					<TabsList className="w-max flex-nowrap">
						{CASH_FLOW_TABS.map((tab) => (
							<TabsTrigger key={tab.value} value={tab.value} className="shrink-0">
								{tab.label}
							</TabsTrigger>
						))}
					</TabsList>
				</div>

				<TabsContent value="summary" className="min-w-0">
					<SummaryTab />
				</TabsContent>

				<TabsContent value="bank-accounts">
					<BankAccountsTab
						bankAccounts={bankAccounts}
						onBankAccountsUpdated={refreshBankAccounts}
					/>
				</TabsContent>

				<TabsContent value="suppliers">
					<SuppliersManagement />
				</TabsContent>

				<TabsContent value="checking-accounts">
					<CheckingAccountsTab />
				</TabsContent>

				{Object.entries(CATEGORY_TABS).map(([tabValue, config]) => {
					const categoriesConfig = (
						<CategoriesConfig
							kind={config.kind}
							title={config.title}
							triggerLabel={config.triggerLabel}
							newLabel={config.newLabel}
							emptyLabel={config.emptyLabel}
						/>
					);
					return (
						<TabsContent key={tabValue} value={tabValue} className="space-y-6 min-w-0">
							{tabValue === 'fixed-expenses' ? (
								<>
									<div className="flex items-center justify-end">{categoriesConfig}</div>
									<FixedExpensesTab />
								</>
							) : tabValue === 'incomes' ? (
								<IncomesTab categoriesConfig={categoriesConfig} />
							) : tabValue === 'expenses' ? (
								<ExpensesTab categoriesConfig={categoriesConfig} />
							) : tabValue === 'collections' ? (
								<CollectionsTab categoriesConfig={categoriesConfig} />
							) : tabValue === 'payments' ? (
								<PaymentsTab categoriesConfig={categoriesConfig} />
							) : (
								<Card className="p-12 bg-card border-border text-center">
									<p className="text-muted-foreground">Próximamente</p>
								</Card>
							)}
						</TabsContent>
					);
				})}

				{CASH_FLOW_TABS.filter(
					(tab) =>
						tab.value !== 'summary' &&
						tab.value !== 'bank-accounts' &&
						tab.value !== 'checking-accounts' &&
						tab.value !== 'suppliers' &&
						!(tab.value in CATEGORY_TABS)
				).map((tab) => (
					<TabsContent key={tab.value} value={tab.value}>
						<Card className="p-12 bg-card border-border text-center">
							<p className="text-muted-foreground">Próximamente</p>
						</Card>
					</TabsContent>
				))}
			</Tabs>

			{/* Dialogs */}
			<TransactionDialog
				open={isTransactionDialogOpen}
				onOpenChange={setIsTransactionDialogOpen}
				type={transactionType}
				cashBoxId={openCashBox?.id || 0}
				bankAccounts={activeBankAccounts}
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

			<CloseCashBoxDialog
				open={isCloseCashBoxDialogOpen}
				onOpenChange={setIsCloseCashBoxDialogOpen}
				currentBalance={cashBoxSummary?.current_balance || 0}
				onCloseCashBox={handleCloseCashBox}
			/>

			<OpenCashBoxDialog
				open={isOpenCashBoxDialogOpen}
				onOpenChange={setIsOpenCashBoxDialogOpen}
				onOpenCashBox={handleCreateCashBox}
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
							Esta acción no se puede deshacer. Se eliminará permanentemente la transacción{' '}
							{transactionToDelete && (
								<>
									<span className="font-semibold">
										{transactionToDelete.description ||
											(transactionToDelete.type === 'income'
												? getPaymentMethodLabel(transactionToDelete.category)
												: getExpenseCategoryLabel(transactionToDelete.category))}{' '}
									</span>
									<span>
										con el siguiente monto: <b>{formatCurrency(transactionToDelete.amount)}</b>
									</span>
								</>
							)}
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
