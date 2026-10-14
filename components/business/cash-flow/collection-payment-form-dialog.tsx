import {
	Dialog,
	DialogContent,
	DialogDescription,
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
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CashFlowCategory } from '@/lib/categories/categories';
import { Work } from '@/lib/works/works';
import { PaymentMethod } from '@/lib/payment-methods/payment-methods';
import { BankAccount } from '@/lib/cash-flow/cash-flow';
import { PartyOption } from '@/hooks/income-expense/use-income-expense-tab';
import { CollectionPaymentEntry } from '@/hooks/collection-payment/use-collection-payment-tab';
import { formatNumber } from '@/utils/formats-money';
import { EntityCombobox } from '@/components/business/cash-flow/entity-combobox';
import { withInactiveSelected } from '@/utils/select-options';

type CollectionPaymentFormDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingEntry: CollectionPaymentEntry | null;
	entityLabel: string;
	partyLabel: string;
	categories: CashFlowCategory[];
	activeCategories: CashFlowCategory[];
	works: Work[];
	parties: PartyOption[];
	paymentMethods: PaymentMethod[];
	activePaymentMethods: PaymentMethod[];
	bankAccounts: BankAccount[];
	date: string;
	setDate: (value: string) => void;
	receiptNumber: string;
	setReceiptNumber: (value: string) => void;
	workId: string;
	setWorkId: (value: string) => void;
	partyId: string;
	setPartyId: (value: string) => void;
	categoryId: string;
	setCategoryId: (value: string) => void;
	description: string;
	setDescription: (value: string) => void;
	amount: string;
	setAmount: (value: string) => void;
	paymentMethodId: string;
	setPaymentMethodId: (value: string) => void;
	bankAccountId: string;
	setBankAccountId: (value: string) => void;
	saving: boolean;
	onSubmit: (e: React.FormEvent) => void;
};

const NO_CATEGORY = '__none__';

export function CollectionPaymentFormDialog({
	open,
	onOpenChange,
	editingEntry,
	entityLabel,
	partyLabel,
	categories,
	activeCategories,
	works,
	parties,
	paymentMethods,
	activePaymentMethods,
	bankAccounts,
	date,
	setDate,
	receiptNumber,
	setReceiptNumber,
	workId,
	setWorkId,
	partyId,
	setPartyId,
	categoryId,
	setCategoryId,
	description,
	setDescription,
	amount,
	setAmount,
	paymentMethodId,
	setPaymentMethodId,
	bankAccountId,
	setBankAccountId,
	saving,
	onSubmit,
}: CollectionPaymentFormDialogProps) {
	// Works only belong to a client, so filtering by counterpart only makes sense for Cliente (not Proveedor).
	const filterWorksByParty = partyLabel === 'Cliente';
	const selectedPartyId = partyId ? Number(partyId) : null;
	const filteredWorks =
		filterWorksByParty && selectedPartyId
			? works.filter((work) => work.client_id === selectedPartyId || String(work.id) === workId)
			: works;
	const workOptions = filteredWorks.map((work) => ({
		id: work.id,
		label: work.name || `Obra #${work.id}`,
	}));
	const workPlaceholder =
		filterWorksByParty && !selectedPartyId
			? 'Elegí un cliente primero'
			: filterWorksByParty && workOptions.length === 0
				? 'Sin obras para este cliente'
				: 'Sin obra';
	const workDisabled = filterWorksByParty && !selectedPartyId;

	const handlePartyChange = (newPartyId: string) => {
		setPartyId(newPartyId);
		if (!filterWorksByParty || !workId) return;
		const newPartyIdNum = newPartyId ? Number(newPartyId) : null;
		const currentWork = works.find((work) => String(work.id) === workId);
		if (!currentWork || currentWork.client_id !== newPartyIdNum) {
			setWorkId('');
		}
	};

	const partyOptions = parties.map((party) => ({ id: party.id, label: party.name }));
	// On create only active options show; on edit the saved-but-inactive one stays visible too.
	const categoryOptions = withInactiveSelected(
		activeCategories,
		categories,
		categoryId,
		!!editingEntry
	);
	const paymentMethodOptions = withInactiveSelected(
		activePaymentMethods,
		paymentMethods,
		paymentMethodId,
		!!editingEntry
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{editingEntry ? `Editar ${entityLabel}` : `Nuevo ${entityLabel}`}
					</DialogTitle>
					<DialogDescription>
						{editingEntry
							? `Modifica los datos del ${entityLabel}`
							: `Registra un nuevo ${entityLabel}`}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={onSubmit} className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="cp-date">Fecha</Label>
							<Input
								id="cp-date"
								type="date"
								value={date}
								onChange={(e) => setDate(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="cp-receipt-number">N° comprobante/recibo</Label>
							<Input
								id="cp-receipt-number"
								value={receiptNumber}
								onChange={(e) => setReceiptNumber(e.target.value)}
								maxLength={60}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="cp-party">{partyLabel}</Label>
						<EntityCombobox
							id="cp-party"
							value={partyId}
							onValueChange={handlePartyChange}
							options={partyOptions}
							placeholder={`Selecciona un/a ${partyLabel.toLowerCase()}`}
							searchPlaceholder={`Buscar ${partyLabel.toLowerCase()}...`}
							emptyLabel="No se encontraron resultados"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="cp-work">Obra (opcional)</Label>
						<div className="flex gap-2">
							<div className="flex-1">
								<EntityCombobox
									id="cp-work"
									value={workId}
									onValueChange={setWorkId}
									options={workOptions}
									placeholder={workPlaceholder}
									searchPlaceholder="Buscar obra..."
									emptyLabel="No se encontraron obras"
									disabled={workDisabled}
								/>
							</div>
							{workId && (
								<Button type="button" variant="outline" onClick={() => setWorkId('')}>
									Quitar
								</Button>
							)}
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="cp-category">Categoría (opcional)</Label>
						<Select
							value={categoryId || NO_CATEGORY}
							onValueChange={(v) => setCategoryId(v === NO_CATEGORY ? '' : v)}
						>
							<SelectTrigger id="cp-category">
								<SelectValue placeholder="Sin categoría" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={NO_CATEGORY}>Sin categoría</SelectItem>
								{categoryOptions.map((category) => (
									<SelectItem key={category.id} value={String(category.id)}>
										{category.name}
										{!category.is_active && ' (inactivo)'}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="cp-description">Detalle</Label>
						<Input
							id="cp-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							maxLength={300}
						/>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="cp-amount">Monto</Label>
							<Input
								id="cp-amount"
								type="text"
								placeholder="0,00"
								value={amount}
								onChange={(e) => {
									const formatted = formatNumber(e.target.value);
									// Cap to 2 decimals while typing (DB amount is money, no 3rd decimal)
									const [intPart, decPart] = formatted.split(',');
									setAmount(
										decPart !== undefined ? `${intPart},${decPart.slice(0, 2)}` : formatted
									);
								}}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="cp-payment-method">Medio de pago</Label>
							<Select value={paymentMethodId} onValueChange={setPaymentMethodId} required>
								<SelectTrigger id="cp-payment-method">
									<SelectValue placeholder="Selecciona un medio" />
								</SelectTrigger>
								<SelectContent>
									{paymentMethodOptions.map((method) => (
										<SelectItem key={method.id} value={String(method.id)}>
											{method.name}
											{!method.is_active && ' (inactivo)'}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="cp-bank-account">Cuenta bancaria (opcional)</Label>
						<Select value={bankAccountId} onValueChange={setBankAccountId}>
							<SelectTrigger id="cp-bank-account">
								<SelectValue placeholder="Selecciona una cuenta" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">Sin cuenta</SelectItem>
								{bankAccounts.map((account) => (
									<SelectItem key={account.id} value={String(account.id)}>
										{account.bank} - {account.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex gap-2">
						<Button type="submit" disabled={saving} className="flex-1">
							{saving ? 'Guardando...' : editingEntry ? 'Actualizar' : 'Crear'}
						</Button>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancelar
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
