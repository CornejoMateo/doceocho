'use client';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
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
import { BalanceWithBudget, getBalanceById } from '@/lib/balances/balances';
import { formatCurrency } from '@/utils/formats-money';
import { formatCreatedAt } from '@/utils/format-date';
import { AddTransactionSection } from './transactions/add-transaction';
import { TransactionsTable } from './transactions/transactions-table';
import { BalanceInformation } from './balance-information';
import { NotesInput } from '@/components/ui/notes-input';
import { useState, useEffect } from 'react';
import { useTransactionCrud } from '@/hooks/balances/use-transaction-crud';
import { useTransactionFiles } from '@/hooks/balances/use-transaction-files';
import { TransactionFilesGallery } from './transactions/transaction-files-gallery';

interface BalanceDetailsModalProps {
	balance: BalanceWithBudget | null;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onTransactionCreated?: () => void;
}

export function BalanceDetailsModal({
	balance,
	isOpen,
	onOpenChange,
	onTransactionCreated,
}: BalanceDetailsModalProps) {
	const [currentBalance, setCurrentBalance] = useState(balance);

	useEffect(() => {
		setCurrentBalance(balance);
	}, [balance]);

	const refreshBalance = async () => {
		if (!currentBalance) return;
		const { data } = await getBalanceById(currentBalance.id);
		if (data) setCurrentBalance(data);
		onTransactionCreated?.();
	};

	const handleTransactionCreated = () => {
		refreshBalance();
	};

	const {
		transactionForFiles,
		transactionFiles,
		isLoadingFiles,
		isUploadingFiles,
		uploadFilesForTransaction,
		handleViewTransactionFiles,
		handleDeleteTransactionFile,
		handleUploadFilesFromGallery,
		handleCloseGallery,
	} = useTransactionFiles(currentBalance);

	const clientId = (currentBalance as any)?.client_id;

	const {
		transactions,
		isLoading,
		addingMode,
		setAddingMode,
		transactionToDelete,
		setTransactionToDelete,
		isDeleteDialogOpen,
		setIsDeleteDialogOpen,
		isEditingNotes,
		setIsEditingNotes,
		balanceNotes,
		setBalanceNotes,
		editingTransaction,
		transactionFilesToUpload,
		setTransactionFilesToUpload,
		isSavingTransaction,
		transactionDate,
		setTransactionDate,
		transactionAmount,
		setTransactionAmount,
		paymentMethod,
		setPaymentMethod,
		notes,
		setNotes,
		quoteUsd,
		setQuoteUsd,
		usdAmount,
		setUsdAmount,
		handleAddTransaction,
		handleDeleteTransaction,
		handleUpdateBalanceNotes,
		resetTransactionForm,
		handleEditTransaction,
		handleUpdateTransaction,
		totalPaid,
		totalPaidUSD,
		totalExtraArs,
		totalExtraUsd,
		summary,
		work,
	} = useTransactionCrud(
		currentBalance,
		isOpen,
		uploadFilesForTransaction,
		handleTransactionCreated
	);

	const handleGalleryUpload = (files: File[]) => {
		if (clientId) {
			handleUploadFilesFromGallery(clientId, files);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="!max-w-5xl !max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Detalle del saldo</DialogTitle>
					<DialogDescription>
						Información completa del saldo, pagos realizados y estado de la obra.
					</DialogDescription>
				</DialogHeader>

				{currentBalance && (
					<div className="space-y-6">
						<BalanceInformation
							balanceId={currentBalance.id}
							work={work}
							budget={currentBalance.budget}
							startDate={currentBalance.start_date}
							contractDateUsd={currentBalance.contract_date_usd}
							usdCurrent={currentBalance.usd_current}
							totalPaid={totalPaid}
							totalPaidUsd={totalPaidUSD}
							totalExtraArs={totalExtraArs}
							totalExtraUsd={totalExtraUsd}
							summary={summary}
							formatDate={formatCreatedAt}
							onUpdated={refreshBalance}
						/>

						<div className="border rounded-lg p-4">
							<div className="flex items-center justify-between mb-3">
								<h4 className="font-semibold">Notas del saldo</h4>
								{!isEditingNotes && (
									<button
										onClick={() => setIsEditingNotes(true)}
										className="text-sm text-primary hover:underline"
									>
										{currentBalance.notes && String(currentBalance.notes).trim() !== ''
											? 'Editar notas'
											: 'Agregar notas'}
									</button>
								)}
							</div>
							{isEditingNotes ? (
								<div className="space-y-3">
									<NotesInput
										value={balanceNotes}
										onChange={setBalanceNotes}
										placeholder="Agregar notas sobre este saldo (opcional)"
										rows={3}
										showLabel={false}
									/>
									<div className="flex justify-end gap-2">
										<button
											onClick={() => {
												setIsEditingNotes(false);
												setBalanceNotes(currentBalance.notes ?? '');
											}}
											className="px-4 py-2 text-sm border rounded-md hover:bg-secondary"
										>
											Cancelar
										</button>
										<button
											onClick={handleUpdateBalanceNotes}
											className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
										>
											Guardar
										</button>
									</div>
								</div>
							) : (
								<div>
									{currentBalance.notes && currentBalance.notes.length > 0 ? (
										<div className="text-sm text-muted-foreground whitespace-pre-wrap">
											{currentBalance.notes}
										</div>
									) : (
										<p className="text-sm text-muted-foreground italic">No hay notas agregadas</p>
									)}
								</div>
							)}
						</div>

						<AddTransactionSection
							addingMode={addingMode}
							transactionDate={transactionDate}
							onTransactionDateChange={setTransactionDate}
							transactionAmount={transactionAmount}
							onTransactionAmountChange={setTransactionAmount}
							usdAmount={usdAmount}
							onUsdAmountChange={setUsdAmount}
							quoteUsd={quoteUsd}
							onQuoteUsdChange={setQuoteUsd}
							notes={notes}
							onNotesChange={setNotes}
							paymentMethod={paymentMethod}
							onPaymentMethodChange={setPaymentMethod}
							onCancel={resetTransactionForm}
							onSave={
								editingTransaction
									? handleUpdateTransaction
									: addingMode === 'extra'
										? () => handleAddTransaction(true)
										: () => handleAddTransaction()
							}
							onStartAddTransaction={() => setAddingMode('transaction')}
							onStartAddExtra={() => setAddingMode('extra')}
							saveDisabled={!transactionAmount || isSavingTransaction}
							editingTransaction={editingTransaction ?? undefined}
							selectedFiles={transactionFilesToUpload}
							onFilesSelect={(newFiles) =>
								setTransactionFilesToUpload((prev) => [...prev, ...newFiles])
							}
							onRemoveFile={(index) =>
								setTransactionFilesToUpload((prev) => prev.filter((_, i) => i !== index))
							}
						/>

						<div className="border rounded-lg">
							<TransactionsTable
								isLoading={isLoading}
								transactions={transactions}
								formatDate={formatCreatedAt}
								onDeleteTransaction={(transaction) => {
									setTransactionToDelete(transaction);
									setIsDeleteDialogOpen(true);
								}}
								onEditTransaction={handleEditTransaction}
								onViewFiles={handleViewTransactionFiles}
							/>
						</div>
					</div>
				)}
			</DialogContent>

			<TransactionFilesGallery
				open={!!transactionForFiles}
				transaction={transactionForFiles}
				files={transactionFiles}
				isLoadingFiles={isLoadingFiles}
				isUploadingFiles={isUploadingFiles}
				onUploadFiles={handleGalleryUpload}
				onDeleteFile={handleDeleteTransactionFile}
				onClose={handleCloseGallery}
				formatCreatedAt={formatCreatedAt}
			/>

			<AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Eliminar transacción?</AlertDialogTitle>
						<AlertDialogDescription>
							Esta acción no se puede deshacer. Se eliminará permanentemente la transacción
							{transactionToDelete && (
								<>
									{' '}
									de {formatCurrency(transactionToDelete.amount)} del{' '}
									{formatCreatedAt(transactionToDelete.date)}
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
		</Dialog>
	);
}
