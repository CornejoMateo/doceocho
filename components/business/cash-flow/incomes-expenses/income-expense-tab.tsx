'use client';

import { useEffect, useState } from 'react';
import {
	IncomeExpenseEntry,
	useIncomeExpenseTab,
} from '@/hooks/income-expense/use-income-expense-tab';
import { IncomeExpenseFilters } from '@/components/business/cash-flow/incomes-expenses/income-expense-filters';
import { IncomeExpenseSummary } from '@/components/business/cash-flow/incomes-expenses/income-expense-summary';
import { IncomeExpenseMonthlyGrid } from '@/components/business/cash-flow/incomes-expenses/income-expense-monthly-grid';
import { IncomeExpenseByCategory } from '@/components/business/cash-flow/incomes-expenses/income-expense-by-category';
import { IncomeExpenseList } from '@/components/business/cash-flow/incomes-expenses/income-expense-list';
import { IncomeExpenseFormDialog } from '@/components/business/cash-flow/incomes-expenses/income-expense-form-dialog';
import { VoucherTypesConfig } from '@/components/business/cash-flow/incomes-expenses/voucher-types-config';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/utils/formats-money';
import { formatDateOnly } from '@/utils/format-date';
import { listPaymentsByExpenseIds } from '@/lib/payments/payments';
import {
	EntityAttachmentsDialog,
	type EntityAttachmentsSummaryRow,
} from '@/components/business/shared/attachments/entity-attachments-dialog';

type IncomeExpenseTabProps = {
	state: ReturnType<typeof useIncomeExpenseTab>;
	entityLabel: string;
	partyLabel: string;
	addLabel: string;
	emptyLabel: string;
	categoriesConfig: React.ReactNode;
	onAddPayment?: (entry: IncomeExpenseEntry) => void;
	cascadeDeleteWarning?: boolean;
	attachmentsKind?: 'expense';
};

// Generic orchestrator shared by Incomes and Expenses
export function IncomeExpenseTab({
	state,
	entityLabel,
	partyLabel,
	addLabel,
	emptyLabel,
	categoriesConfig,
	onAddPayment,
	cascadeDeleteWarning = false,
	attachmentsKind,
}: IncomeExpenseTabProps) {
	const [linkedPaymentsCount, setLinkedPaymentsCount] = useState<number | null>(null);
	const [countLoading, setCountLoading] = useState(false);
	const [countFailed, setCountFailed] = useState(false);
	const entryToDeleteId = state.entryToDelete?.id ?? null;

	const showAttachmentsDialog = attachmentsKind === 'expense';
	const [entryForDetailsId, setEntryForDetailsId] = useState<number | null>(null);
	const entryForDetails =
		entryForDetailsId != null
			? (state.entries.find((entry) => entry.id === entryForDetailsId) ?? null)
			: null;

	useEffect(() => {
		if (entryForDetailsId != null && entryForDetails == null) setEntryForDetailsId(null);
	}, [entryForDetailsId, entryForDetails]);

	const detailsSummary: EntityAttachmentsSummaryRow[] = entryForDetails
		? [
				{ label: 'Fecha', value: formatDateOnly(entryForDetails.date) },
				{
					label: 'Comprobante',
					value: entryForDetails.voucher_number
						? `${entryForDetails.voucher_type_name} · ${entryForDetails.voucher_number}`
						: entryForDetails.voucher_type_name,
				},
				{ label: partyLabel, value: entryForDetails.party_name },
				{ label: 'Obra', value: entryForDetails.work_name || '-' },
				{ label: 'Categoría', value: entryForDetails.category_name },
				{ label: 'Detalle', value: entryForDetails.description || '-' },
				{ label: 'Neto', value: formatCurrency(entryForDetails.net_amount) },
				{ label: 'IVA', value: formatCurrency(entryForDetails.iva_amount) },
				{ label: 'Total', value: formatCurrency(entryForDetails.total_amount) },
				{ label: 'Medio de pago', value: entryForDetails.payment_method_name || '-' },
				{ label: 'Cuenta bancaria', value: entryForDetails.bank_account_name || '-' },
			]
		: [];

	useEffect(() => {
		if (!cascadeDeleteWarning || entryToDeleteId == null) {
			setLinkedPaymentsCount(null);
			setCountLoading(false);
			setCountFailed(false);
			return;
		}
		let cancelled = false;
		setCountLoading(true);
		setCountFailed(false);
		void listPaymentsByExpenseIds([entryToDeleteId])
			.then(({ data, error }) => {
				if (cancelled) return;
				if (error || !data) {
					setCountFailed(true);
					setLinkedPaymentsCount(null);
					return;
				}
				setLinkedPaymentsCount(data.length);
			})
			.finally(() => {
				if (!cancelled) setCountLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [cascadeDeleteWarning, entryToDeleteId]);

	const deleteDescription = (() => {
		if (!state.entryToDelete) return '';
		const base = `Se eliminará el ${entityLabel} de ${state.entryToDelete.party_name} por ${formatCurrency(state.entryToDelete.total_amount)}.`;
		if (!cascadeDeleteWarning) return `${base} Esta acción no se puede deshacer.`;
		return base;
	})();

	const cascadeWarning = (() => {
		if (!cascadeDeleteWarning || !state.entryToDelete) return null;
		const warningText = countLoading
			? 'Verificando pagos asociados...'
			: countFailed
				? 'Al eliminar este gasto también se eliminarán sus pagos asociados (si tiene) y sus archivos adjuntos. Esta acción no se puede deshacer.'
				: linkedPaymentsCount
					? `Al eliminar este gasto también se eliminarán sus ${linkedPaymentsCount} pago${linkedPaymentsCount === 1 ? '' : 's'} asociado${linkedPaymentsCount === 1 ? '' : 's'} y sus archivos adjuntos. Esta acción no se puede deshacer.`
					: 'Este gasto no tiene pagos asociados. Al eliminarlo también se eliminarán sus archivos adjuntos. Esta acción no se puede deshacer.';
		return (
			<Alert variant="destructive">
				<AlertTriangle className="h-4 w-4" aria-hidden="true" />
				<AlertDescription>{warningText}</AlertDescription>
			</Alert>
		);
	})();

	return (
		<div className="space-y-4 min-w-0">
			<div className="flex flex-wrap items-center justify-end gap-3">
				<Select value={String(state.year)} onValueChange={(v) => state.setYear(Number(v))}>
					<SelectTrigger className="w-28" aria-label="Año">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{state.yearOptions.map((option) => (
							<SelectItem key={option} value={String(option)}>
								{option}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<VoucherTypesConfig />
				{categoriesConfig}
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				<div className="lg:col-span-2 min-w-0 space-y-4">
					<IncomeExpenseFilters
						addLabel={addLabel}
						onAdd={state.handleAdd}
						partyLabel={partyLabel}
						dateFrom={state.dateFrom}
						onDateFromChange={state.setDateFrom}
						dateTo={state.dateTo}
						onDateToChange={state.setDateTo}
						workId={state.filterWorkId}
						onWorkIdChange={state.setFilterWorkId}
						works={state.works}
						partyId={state.filterPartyId}
						onPartyIdChange={state.setFilterPartyId}
						parties={state.parties}
						categoryId={state.filterCategoryId}
						onCategoryIdChange={state.setFilterCategoryId}
						categories={state.categories}
						search={state.search}
						onSearchChange={state.setSearch}
						onClear={state.clearFilters}
						activeFilterCount={state.activeFilterCount}
						filterDialogOpen={state.filterDialogOpen}
						onFilterDialogOpenChange={state.setFilterDialogOpen}
					/>

					<IncomeExpenseList
						entries={state.visibleEntries}
						loading={state.loadingList}
						partyLabel={partyLabel}
						emptyLabel={emptyLabel}
						onEdit={state.handleEdit}
						onAskDelete={state.setEntryToDelete}
						onAddPayment={onAddPayment}
						onRowClick={
							showAttachmentsDialog ? (entry) => setEntryForDetailsId(entry.id) : undefined
						}
						pageResetKey={[
							state.year,
							state.dateFrom,
							state.dateTo,
							state.filterWorkId,
							state.filterPartyId,
							state.filterCategoryId,
							state.search,
						].join('|')}
					/>
				</div>

				<div className="lg:col-span-1 min-w-0 space-y-4">
					<IncomeExpenseSummary
						totalNet={state.summary.totalNet}
						totalIva={state.summary.totalIva}
						totalGross={state.summary.totalGross}
						count={state.summary.count}
						average={state.summary.average}
					/>
					<IncomeExpenseMonthlyGrid entries={state.visibleEntries} year={state.year} />
					<IncomeExpenseByCategory entries={state.visibleEntries} categories={state.categories} />
				</div>
			</div>

			<IncomeExpenseFormDialog
				open={state.isFormOpen}
				onOpenChange={state.handleFormOpenChange}
				editingEntry={state.editingEntry}
				entityLabel={entityLabel}
				partyLabel={partyLabel}
				categories={state.categories}
				activeCategories={state.activeCategories}
				voucherTypes={state.voucherTypes}
				activeVoucherTypes={state.activeVoucherTypes}
				works={state.works}
				parties={state.parties}
				paymentMethods={state.paymentMethods}
				activePaymentMethods={state.activePaymentMethods}
				bankAccounts={state.bankAccounts}
				activeBankAccounts={state.activeBankAccounts}
				date={state.date}
				setDate={state.setDate}
				voucherNumber={state.voucherNumber}
				setVoucherNumber={state.setVoucherNumber}
				voucherTypeId={state.voucherTypeId}
				setVoucherTypeId={state.setVoucherTypeId}
				workId={state.workId}
				setWorkId={state.setWorkId}
				partyId={state.partyId}
				setPartyId={state.setPartyId}
				categoryId={state.categoryId}
				setCategoryId={state.setCategoryId}
				description={state.description}
				setDescription={state.setDescription}
				netAmount={state.netAmount}
				setNetAmount={state.setNetAmount}
				ivaPercent={state.ivaPercent}
				setIvaPercent={state.setIvaPercent}
				totalAmount={state.totalAmount}
				paymentMethodId={state.paymentMethodId}
				setPaymentMethodId={state.setPaymentMethodId}
				bankAccountId={state.bankAccountId}
				setBankAccountId={state.setBankAccountId}
				saving={state.saving}
				onSubmit={state.handleSubmit}
				errors={state.errors}
				attachmentsKind={attachmentsKind}
				stagedFiles={state.stagedFiles}
				onStagedFilesChange={state.setStagedFiles}
			/>

			<ConfirmDialog
				open={!!state.entryToDelete}
				onOpenChange={(open) => {
					if (!open && !state.deleting) state.setEntryToDelete(null);
				}}
				title={`¿Eliminar ${entityLabel}?`}
				description={deleteDescription}
				extra={cascadeWarning}
				confirmText={cascadeDeleteWarning ? 'Eliminar gasto y pagos' : 'Eliminar'}
				loadingText="Eliminando..."
				isLoading={state.deleting}
				onConfirm={state.confirmDelete}
			/>

			{showAttachmentsDialog && (
				<EntityAttachmentsDialog
					open={!!entryForDetails}
					onOpenChange={(open) => {
						if (!open) setEntryForDetailsId(null);
					}}
					kind="expense"
					entityId={entryForDetails?.id ?? null}
					title={`Detalle del ${entityLabel}`}
					summary={detailsSummary}
				/>
			)}
		</div>
	);
}
