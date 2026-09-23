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
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useTransactionCrud } from '@/hooks/balances/use-transaction-crud';
import { useTransactionFiles } from '@/hooks/balances/use-transaction-files';
import { TransactionFilesGallery } from './transactions/transaction-files-gallery';
import { SettledReminderModal } from './settled-reminder-modal';

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
	const [isSettleConfirmOpen, setIsSettleConfirmOpen] = useState(false);

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
		isInitialLoading,
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
		isDeletingTransaction,
		transactionDate,
		setTransactionDate,
		transactionAmount,
		setTransactionAmount,
		bankAccountId,
		setBankAccountId,
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
		summary,
		work,
		showSettledReminder,
		isTogglingSettled,
		dismissSettledReminder,
		handleMarkAsSettled,
		handleUnmarkAsSettled,
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

	const handleConfirmSettleToggle = async () => {
		if (currentBalance?.is_settled) {
			await handleUnmarkAsSettled();
		} else {
			await handleMarkAsSettled();
		}
		setIsSettleConfirmOpen(false);
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="w-[95vw] sm:w-full sm:max-w-5xl max-h-[92dvh] overflow-y-auto p-4 sm:p-6">
				<DialogHeader className="text-left">
					<DialogTitle className="text-lg sm:text-xl">Detalle de la cuenta corriente</DialogTitle>
					<DialogDescription className="text-sm">
						Información completa de la cuenta corriente, pagos realizados y estado de la obra.
					</DialogDescription>
				</DialogHeader>

				{!currentBalance || isInitialLoading ? (
					<div className="flex items-center justify-center py-24">
						<Spinner className="h-8 w-8 text-muted-foreground" />
					</div>
				) : (
					<div className="space-y-5 sm:space-y-6">
						<div
							className={`relative flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${
								currentBalance.is_settled ? 'border-green-500/40 bg-green-500/10' : ''
							}`}
						>
							<span className="text-base font-semibold sm:text-sm sm:font-medium">
								Estado: {summary.type}
							</span>
							<Button
								size="sm"
								variant="outline"
								className="h-10 w-full sm:h-8 sm:w-auto"
								onClick={() => setIsSettleConfirmOpen(true)}
								disabled={isTogglingSettled}
							>
								{isTogglingSettled
									? 'Guardando...'
									: currentBalance.is_settled
										? 'Desmarcar como saldado'
										: 'Marcar como saldado'}
							</Button>
						</div>

						<BalanceInformation
							balanceId={currentBalance.id}
							work={work}
							budget={currentBalance.budget}
							startDate={currentBalance.start_date}
							contractDateUsd={currentBalance.contract_date_usd}
							usdCurrent={currentBalance.usd_current}
							totalPaid={totalPaid}
							totalPaidUsd={totalPaidUSD}
							summary={summary}
							formatDate={formatCreatedAt}
							onUpdated={refreshBalance}
						/>

						<div className="rounded-lg border overflow-hidden">
							<div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
								<h4 className="text-sm font-semibold sm:text-base">Transacciones</h4>
							</div>
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
							onBankAccountIdChange={setBankAccountId}
							bankAccountId={bankAccountId}
							onCancel={resetTransactionForm}
							onSave={editingTransaction ? handleUpdateTransaction : () => handleAddTransaction()}
							onStartAddTransaction={() => setAddingMode('transaction')}
							saveDisabled={isSavingTransaction}
							editingTransaction={editingTransaction ?? undefined}
							selectedFiles={transactionFilesToUpload}
							onFilesSelect={(newFiles) =>
								setTransactionFilesToUpload((prev) => [...prev, ...newFiles])
							}
							onRemoveFile={(index) =>
								setTransactionFilesToUpload((prev) => prev.filter((_, i) => i !== index))
							}
						/>

						<div className="border rounded-lg p-4">
							<div className="flex items-center justify-between gap-2 mb-3">
								<h4 className="font-semibold">Notas de la cuenta corriente</h4>
								{!isEditingNotes && (
									<button
										onClick={() => setIsEditingNotes(true)}
										className="shrink-0 text-sm text-primary hover:underline"
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
										placeholder="Agregar notas sobre esta cuenta corriente (opcional)"
										rows={3}
										showLabel={false}
									/>
									<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
										<button
											onClick={() => {
												setIsEditingNotes(false);
												setBalanceNotes(currentBalance.notes ?? '');
											}}
											className="w-full px-4 py-2 text-sm border rounded-md hover:bg-secondary sm:w-auto"
										>
											Cancelar
										</button>
										<button
											onClick={handleUpdateBalanceNotes}
											className="w-full px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 sm:w-auto"
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
					</div>
				)}

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

				<SettledReminderModal
					isOpen={showSettledReminder}
					onOpenChange={(open) => !open && dismissSettledReminder()}
					onConfirm={handleMarkAsSettled}
					isConfirming={isTogglingSettled}
				/>

				<AlertDialog open={isSettleConfirmOpen} onOpenChange={setIsSettleConfirmOpen}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>
								{currentBalance?.is_settled
									? '¿Desmarcar esta cuenta corriente como saldada?'
									: '¿Marcar esta cuenta corriente como saldada?'}
							</AlertDialogTitle>
							<AlertDialogDescription>
								{currentBalance?.is_settled
									? 'La cuenta corriente dejará de figurar como saldada.'
									: 'La cuenta corriente pasará a figurar como saldada. Podés desmarcarla más adelante si es necesario.'}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel disabled={isTogglingSettled}>Cancelar</AlertDialogCancel>
							<Button onClick={handleConfirmSettleToggle} disabled={isTogglingSettled}>
								{isTogglingSettled
									? 'Guardando...'
									: currentBalance?.is_settled
										? 'Desmarcar como saldado'
										: 'Marcar como saldado'}
							</Button>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

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
							<AlertDialogCancel disabled={isDeletingTransaction}>Cancelar</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleDeleteTransaction}
								disabled={isDeletingTransaction}
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							>
								{isDeletingTransaction ? 'Eliminando...' : 'Eliminar'}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</DialogContent>
		</Dialog>
	);
}
