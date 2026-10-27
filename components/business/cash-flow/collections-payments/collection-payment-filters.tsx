import { EditOnly } from '@/components/permissions/edit-scope';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, Plus } from 'lucide-react';
import { CashFlowCategory } from '@/lib/categories/categories';
import { Work } from '@/lib/works/works';
import { PaymentMethod } from '@/lib/payment-methods/payment-methods';
import { PartyOption } from '@/hooks/income-expense/use-income-expense-tab';
import { CollectionPaymentFilterDialog } from '@/components/business/cash-flow/collections-payments/collection-payment-filter-dialog';

type CollectionPaymentFiltersProps = {
	addLabel: string;
	onAdd: () => void;
	partyLabel: string;
	dateFrom: string;
	onDateFromChange: (value: string) => void;
	dateTo: string;
	onDateToChange: (value: string) => void;
	workId: string;
	onWorkIdChange: (value: string) => void;
	works: Work[];
	partyId: string;
	onPartyIdChange: (value: string) => void;
	parties: PartyOption[];
	categoryId: string;
	onCategoryIdChange: (value: string) => void;
	categories: CashFlowCategory[];
	paymentMethodId: string;
	onPaymentMethodIdChange: (value: string) => void;
	paymentMethods: PaymentMethod[];
	search: string;
	onSearchChange: (value: string) => void;
	onClear: () => void;
	activeFilterCount: number;
	filterDialogOpen: boolean;
	onFilterDialogOpenChange: (open: boolean) => void;
};

export function CollectionPaymentFilters({
	addLabel,
	onAdd,
	partyLabel,
	dateFrom,
	onDateFromChange,
	dateTo,
	onDateToChange,
	workId,
	onWorkIdChange,
	works,
	partyId,
	onPartyIdChange,
	parties,
	categoryId,
	onCategoryIdChange,
	categories,
	paymentMethodId,
	onPaymentMethodIdChange,
	paymentMethods,
	search,
	onSearchChange,
	onClear,
	activeFilterCount,
	filterDialogOpen,
	onFilterDialogOpenChange,
}: CollectionPaymentFiltersProps) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Input
				placeholder="N° comprobante o detalle"
				value={search}
				onChange={(e) => onSearchChange(e.target.value)}
				className="flex-1 min-w-0 sm:min-w-[220px]"
			/>

			<Button
				type="button"
				variant={activeFilterCount > 0 ? 'default' : 'outline'}
				onClick={() => onFilterDialogOpenChange(true)}
				className="gap-2"
			>
				<Filter className="h-4 w-4" />
				Filtros
				{activeFilterCount > 0 && (
					<Badge variant="secondary" className="rounded-full px-1.5">
						{activeFilterCount}
					</Badge>
				)}
			</Button>

			<EditOnly edit="cash-flow">
				<Button onClick={onAdd} className="gap-2">
					<Plus className="h-4 w-4" />
					{addLabel}
				</Button>
			</EditOnly>

			<CollectionPaymentFilterDialog
				open={filterDialogOpen}
				onOpenChange={onFilterDialogOpenChange}
				partyLabel={partyLabel}
				dateFrom={dateFrom}
				onDateFromChange={onDateFromChange}
				dateTo={dateTo}
				onDateToChange={onDateToChange}
				workId={workId}
				onWorkIdChange={onWorkIdChange}
				works={works}
				partyId={partyId}
				onPartyIdChange={onPartyIdChange}
				parties={parties}
				categoryId={categoryId}
				onCategoryIdChange={onCategoryIdChange}
				categories={categories}
				paymentMethodId={paymentMethodId}
				onPaymentMethodIdChange={onPaymentMethodIdChange}
				paymentMethods={paymentMethods}
				onClear={onClear}
			/>
		</div>
	);
}
