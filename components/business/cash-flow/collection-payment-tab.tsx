'use client';

import { useCollectionPaymentTab } from '@/hooks/collection-payment/use-collection-payment-tab';
import { CollectionPaymentFilters } from '@/components/business/cash-flow/collection-payment-filters';
import { CollectionPaymentSummary } from '@/components/business/cash-flow/collection-payment-summary';
import { CollectionPaymentMonthlyGrid } from '@/components/business/cash-flow/collection-payment-monthly-grid';
import { CollectionPaymentByMethod } from '@/components/business/cash-flow/collection-payment-by-method';
import { CollectionPaymentList } from '@/components/business/cash-flow/collection-payment-list';
import { CollectionPaymentFormDialog } from '@/components/business/cash-flow/collection-payment-form-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/utils/formats-money';

type CollectionPaymentTabProps = {
	state: ReturnType<typeof useCollectionPaymentTab>;
	entityLabel: string;
	partyLabel: string;
	addLabel: string;
	emptyLabel: string;
	monthlyGridTitle: string;
	categoriesConfig: React.ReactNode;
};

// Generic orchestrator shared by Collections and Payments; entity-specific wiring lives in the thin
// collections-tab.tsx/payments-tab.tsx wrappers that build `state` via useCollections()/usePayments().
export function CollectionPaymentTab({
	state,
	entityLabel,
	partyLabel,
	addLabel,
	emptyLabel,
	monthlyGridTitle,
	categoriesConfig,
}: CollectionPaymentTabProps) {
	return (
		<div className="space-y-4 min-w-0">
			{/* Año y categorías agrupados en una sola fila responsive */}
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
				{categoriesConfig}
			</div>

			{/* Lista + filtros a la izquierda, resumen y grilla mensual en columna lateral, mismo esquema que Costos fijos */}
			<div className="grid gap-6 lg:grid-cols-3">
				<div className="lg:col-span-2 min-w-0 space-y-4">
					<CollectionPaymentFilters
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
						paymentMethodId={state.filterPaymentMethodId}
						onPaymentMethodIdChange={state.setFilterPaymentMethodId}
						paymentMethods={state.paymentMethods}
						search={state.search}
						onSearchChange={state.setSearch}
						onClear={state.clearFilters}
						activeFilterCount={state.activeFilterCount}
						filterDialogOpen={state.filterDialogOpen}
						onFilterDialogOpenChange={state.setFilterDialogOpen}
					/>

					<CollectionPaymentList
						entries={state.visibleEntries}
						loading={state.loadingList}
						partyLabel={partyLabel}
						emptyLabel={emptyLabel}
						onEdit={state.handleEdit}
						onAskDelete={state.setEntryToDelete}
					/>
				</div>

				<div className="lg:col-span-1 min-w-0 space-y-4">
					<CollectionPaymentSummary
						total={state.summary.total}
						count={state.summary.count}
						average={state.summary.average}
						max={state.summary.max}
					/>
					<CollectionPaymentMonthlyGrid entries={state.visibleEntries} title={monthlyGridTitle} />
					<CollectionPaymentByMethod
						entries={state.visibleEntries}
						paymentMethods={state.paymentMethods}
					/>
				</div>
			</div>

			<CollectionPaymentFormDialog
				open={state.isFormOpen}
				onOpenChange={state.handleFormOpenChange}
				editingEntry={state.editingEntry}
				entityLabel={entityLabel}
				partyLabel={partyLabel}
				categories={state.categories}
				activeCategories={state.activeCategories}
				works={state.works}
				parties={state.parties}
				paymentMethods={state.paymentMethods}
				activePaymentMethods={state.activePaymentMethods}
				bankAccounts={state.bankAccounts}
				date={state.date}
				setDate={state.setDate}
				receiptNumber={state.receiptNumber}
				setReceiptNumber={state.setReceiptNumber}
				workId={state.workId}
				setWorkId={state.setWorkId}
				partyId={state.partyId}
				setPartyId={state.setPartyId}
				categoryId={state.categoryId}
				setCategoryId={state.setCategoryId}
				description={state.description}
				setDescription={state.setDescription}
				amount={state.amount}
				setAmount={state.setAmount}
				paymentMethodId={state.paymentMethodId}
				setPaymentMethodId={state.setPaymentMethodId}
				bankAccountId={state.bankAccountId}
				setBankAccountId={state.setBankAccountId}
				saving={state.saving}
				onSubmit={state.handleSubmit}
			/>

			<ConfirmDialog
				open={!!state.entryToDelete}
				onOpenChange={(open) => {
					if (!open && !state.deleting) state.setEntryToDelete(null);
				}}
				title={`¿Eliminar ${entityLabel}?`}
				description={
					state.entryToDelete
						? `Se eliminará el ${entityLabel} de ${state.entryToDelete.party_name} por ${formatCurrency(state.entryToDelete.amount)}. Esta acción no se puede deshacer.`
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
