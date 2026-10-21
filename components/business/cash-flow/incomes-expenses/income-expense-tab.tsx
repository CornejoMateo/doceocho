'use client';

import { useIncomeExpenseTab } from '@/hooks/income-expense/use-income-expense-tab';
import { IncomeExpenseFilters } from '@/components/business/cash-flow/incomes-expenses/income-expense-filters';
import { IncomeExpenseSummary } from '@/components/business/cash-flow/incomes-expenses/income-expense-summary';
import { IncomeExpenseMonthlyGrid } from '@/components/business/cash-flow/incomes-expenses/income-expense-monthly-grid';
import { IncomeExpenseByCategory } from '@/components/business/cash-flow/incomes-expenses/income-expense-by-category';
import { IncomeExpenseList } from '@/components/business/cash-flow/incomes-expenses/income-expense-list';
import { IncomeExpenseFormDialog } from '@/components/business/cash-flow/incomes-expenses/income-expense-form-dialog';
import { VoucherTypesConfig } from '@/components/business/cash-flow/incomes-expenses/voucher-types-config';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/utils/formats-money';

type IncomeExpenseTabProps = {
	state: ReturnType<typeof useIncomeExpenseTab>;
	entityLabel: string;
	partyLabel: string;
	addLabel: string;
	emptyLabel: string;
	categoriesConfig: React.ReactNode;
};

// Generic orchestrator shared by Incomes and Expenses
export function IncomeExpenseTab({
	state,
	entityLabel,
	partyLabel,
	addLabel,
	emptyLabel,
	categoriesConfig,
}: IncomeExpenseTabProps) {
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
			/>

			<ConfirmDialog
				open={!!state.entryToDelete}
				onOpenChange={(open) => {
					if (!open && !state.deleting) state.setEntryToDelete(null);
				}}
				title={`¿Eliminar ${entityLabel}?`}
				description={
					state.entryToDelete
						? `Se eliminará el ${entityLabel} de ${state.entryToDelete.party_name} por ${formatCurrency(state.entryToDelete.total_amount)}. Esta acción no se puede deshacer.`
						: ''
				}
				confirmText="Eliminar"
				loadingText="Eliminando..."
				isLoading={state.deleting}
				onConfirm={state.confirmDelete}
			/>
		</div>
	);
}
