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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { CashFlowCategory } from '@/lib/categories/categories';
import { Work } from '@/lib/works/works';
import { PaymentMethod } from '@/lib/payment-methods/payment-methods';
import { BankAccount } from '@/lib/cash-flow/cash-flow';
import { PartyOption } from '@/hooks/income-expense/use-income-expense-tab';
import {
	CollectionPaymentEntry,
	CollectionPaymentFormErrors,
} from '@/hooks/collection-payment/use-collection-payment-tab';
import { formatNumber } from '@/utils/formats-money';
import { EntityCombobox } from '@/components/business/cash-flow/shared/entity-combobox';
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
	activeBankAccounts: BankAccount[];
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
	errors: CollectionPaymentFormErrors;
	partyOptional?: boolean;
	purchaseId?: string;
	setPurchaseId?: (value: string) => void;
	purchases?: PartyOption[];
	purchasesLoading?: boolean;
	descriptionMaxLength?: number;
	linkedLabel?: string;
};

const NO_CATEGORY = '__none__';

// Short red inline message shown under a field once it's marked invalid.
function FieldError({ message }: { message: string }) {
	return <p className="text-destructive text-xs">{message}</p>;
}

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
	activeBankAccounts,
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
	errors,
	partyOptional = false,
	purchaseId = '',
	setPurchaseId,
	purchases = [],
	purchasesLoading = false,
	descriptionMaxLength = 300,
	linkedLabel = 'Compra',
}: CollectionPaymentFormDialogProps) {
	// Works only belong to a client, so filtering by counterpart only makes sense for Cliente (not Proveedor).
	const filterWorksByParty = partyLabel === 'Cliente';
	const selectedPartyId = partyId ? Number(partyId) : null;
	// Origin is locked on edit to avoid moving rows between payments/payments_suppliers.
	const partyDisabled = partyOptional && !!editingEntry && editingEntry.source === 'general';
	const canClearParty = partyOptional && !editingEntry;
	const purchaseOptions = purchases.map((purchase) => ({ id: purchase.id, label: purchase.name }));
	const selectedPurchase = purchases.find((purchase) => String(purchase.id) === purchaseId);
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
	const bankAccountOptions = withInactiveSelected(
		activeBankAccounts,
		bankAccounts,
		bankAccountId,
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
								aria-invalid={!!errors.date}
								required
							/>
							{errors.date && <FieldError message="Elegí una fecha" />}
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
						<Label htmlFor="cp-party">
							{partyLabel}
							{partyOptional && ' (opcional)'}
						</Label>
						<div className="flex gap-2">
							<div className="flex-1">
								<EntityCombobox
									id="cp-party"
									value={partyId}
									onValueChange={handlePartyChange}
									options={partyOptions}
									placeholder={`Selecciona un/a ${partyLabel.toLowerCase()}`}
									searchPlaceholder={`Buscar ${partyLabel.toLowerCase()}...`}
									emptyLabel="No se encontraron resultados"
									disabled={partyDisabled}
									invalid={!!errors.partyId}
								/>
							</div>
							{canClearParty && partyId && (
								<Button type="button" variant="outline" onClick={() => handlePartyChange('')}>
									Quitar
								</Button>
							)}
						</div>
						{errors.partyId && <FieldError message={`Elegí un ${partyLabel.toLowerCase()}`} />}
					</div>

					{partyOptional && partyId && (
						<div className="space-y-2">
							<Label htmlFor="cp-purchase">{linkedLabel}</Label>
							<EntityCombobox
								id="cp-purchase"
								value={purchaseId}
								onValueChange={(v) => setPurchaseId?.(v)}
								options={purchaseOptions}
								placeholder={
									purchasesLoading
										? `Cargando ${linkedLabel.toLowerCase()}s...`
										: `Selecciona una ${linkedLabel.toLowerCase()}`
								}
								searchPlaceholder={`Buscar ${linkedLabel.toLowerCase()}...`}
								emptyLabel={`Sin ${linkedLabel.toLowerCase()}s para este ${partyLabel.toLowerCase()}`}
								invalid={!!errors.purchaseId}
							/>
							{errors.purchaseId && (
								<FieldError message={`Elegí una ${linkedLabel.toLowerCase()}`} />
							)}
							{selectedPurchase?.isSettled && (
								<Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
									<AlertTriangle className="h-4 w-4" />
									<AlertDescription className="text-amber-800 dark:text-amber-300">
										Esta {linkedLabel.toLowerCase()} ya está saldada. Si registrás otro pago,
										quedará un saldo a favor del proveedor.
									</AlertDescription>
								</Alert>
							)}
						</div>
					)}

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
							maxLength={descriptionMaxLength}
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
								aria-invalid={!!errors.amount}
								required
							/>
							{errors.amount && <FieldError message="Ingresá un monto mayor a 0" />}
						</div>
						<div className="space-y-2">
							<Label htmlFor="cp-payment-method">Medio de pago</Label>
							<Select value={paymentMethodId} onValueChange={setPaymentMethodId} required>
								<SelectTrigger id="cp-payment-method" aria-invalid={!!errors.paymentMethodId}>
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
							{errors.paymentMethodId && <FieldError message="Elegí un medio de pago" />}
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
								{bankAccountOptions.map((account) => (
									<SelectItem key={account.id} value={String(account.id)}>
										{account.bank} - {account.name}
										{!account.is_active && ' (inactiva)'}
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
