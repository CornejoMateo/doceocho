import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { CashFlowCategory } from '@/lib/categories/categories';
import { Work } from '@/lib/works/works';
import { PaymentMethod } from '@/lib/payment-methods/payment-methods';
import { PartyOption } from '@/hooks/income-expense/use-income-expense-tab';

type CollectionPaymentFilterDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
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
	onClear: () => void;
};

const ALL = '__all__';

// Mirrors balances-tab's BalanceFilterDialog shell (live-apply, "Limpiar filtros" + "Aceptar").
export function CollectionPaymentFilterDialog({
	open,
	onOpenChange,
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
	onClear,
}: CollectionPaymentFilterDialogProps) {
	// Mirrors the form dialog: works only belong to a client, so filtering by counterpart applies to Cliente only.
	const filterWorksByParty = partyLabel === 'Cliente';
	const selectedPartyId = partyId ? Number(partyId) : null;
	const filteredWorks =
		filterWorksByParty && selectedPartyId
			? works.filter((work) => work.client_id === selectedPartyId || String(work.id) === workId)
			: works;

	const handlePartyChange = (newPartyId: string) => {
		onPartyIdChange(newPartyId);
		if (!filterWorksByParty || !workId) return;
		const newPartyIdNum = newPartyId ? Number(newPartyId) : null;
		const currentWork = works.find((work) => String(work.id) === workId);
		if (!currentWork || currentWork.client_id !== newPartyIdNum) {
			onWorkIdChange('');
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="!sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Filtros</DialogTitle>
					<DialogDescription>
						Filtrá por fecha, obra, {partyLabel.toLowerCase()}, categoría y medio de pago
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4 sm:grid-cols-2">
					<div className="space-y-1">
						<Label htmlFor="cp-filter-date-from">Desde</Label>
						<Input
							id="cp-filter-date-from"
							type="date"
							value={dateFrom}
							onChange={(e) => onDateFromChange(e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="cp-filter-date-to">Hasta</Label>
						<Input
							id="cp-filter-date-to"
							type="date"
							value={dateTo}
							onChange={(e) => onDateToChange(e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="cp-filter-work">Obra</Label>
						<Select value={workId || ALL} onValueChange={(v) => onWorkIdChange(v === ALL ? '' : v)}>
							<SelectTrigger id="cp-filter-work">
								<SelectValue placeholder="Todas" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>Todas</SelectItem>
								{filteredWorks.map((work) => (
									<SelectItem key={work.id} value={String(work.id)}>
										{work.name || `Obra #${work.id}`}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1">
						<Label htmlFor="cp-filter-party">{partyLabel}</Label>
						<Select
							value={partyId || ALL}
							onValueChange={(v) => handlePartyChange(v === ALL ? '' : v)}
						>
							<SelectTrigger id="cp-filter-party">
								<SelectValue placeholder="Todos" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>Todos</SelectItem>
								{parties.map((party) => (
									<SelectItem key={party.id} value={String(party.id)}>
										{party.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1">
						<Label htmlFor="cp-filter-category">Categoría</Label>
						<Select
							value={categoryId || ALL}
							onValueChange={(v) => onCategoryIdChange(v === ALL ? '' : v)}
						>
							<SelectTrigger id="cp-filter-category">
								<SelectValue placeholder="Todas" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>Todas</SelectItem>
								{categories.map((category) => (
									<SelectItem key={category.id} value={String(category.id)}>
										{category.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1">
						<Label htmlFor="cp-filter-payment-method">Medio de pago</Label>
						<Select
							value={paymentMethodId || ALL}
							onValueChange={(v) => onPaymentMethodIdChange(v === ALL ? '' : v)}
						>
							<SelectTrigger id="cp-filter-payment-method">
								<SelectValue placeholder="Todos" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL}>Todos</SelectItem>
								{paymentMethods.map((method) => (
									<SelectItem key={method.id} value={String(method.id)}>
										{method.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClear}>
						Limpiar filtros
					</Button>
					<Button onClick={() => onOpenChange(false)}>Aceptar</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
