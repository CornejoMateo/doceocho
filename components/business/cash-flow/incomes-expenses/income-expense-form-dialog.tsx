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
import { VoucherType } from '@/lib/voucher-types/voucher-types';
import { Work } from '@/lib/works/works';
import {
	PartyOption,
	IncomeExpenseEntry,
	IncomeExpenseFormErrors,
} from '@/hooks/income-expense/use-income-expense-tab';
import { IVA_RATES } from '@/constants/cashflow/iva';
import { formatCurrency, formatNumber } from '@/utils/formats-money';
import { EntityCombobox } from '@/components/business/cash-flow/shared/entity-combobox';
import { withInactiveSelected } from '@/utils/select-options';

type IncomeExpenseFormDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingEntry: IncomeExpenseEntry | null;
	entityLabel: string;
	partyLabel: string;
	categories: CashFlowCategory[];
	activeCategories: CashFlowCategory[];
	voucherTypes: VoucherType[];
	activeVoucherTypes: VoucherType[];
	works: Work[];
	parties: PartyOption[];
	date: string;
	setDate: (value: string) => void;
	voucherNumber: string;
	setVoucherNumber: (value: string) => void;
	voucherTypeId: string;
	setVoucherTypeId: (value: string) => void;
	workId: string;
	setWorkId: (value: string) => void;
	partyId: string;
	setPartyId: (value: string) => void;
	categoryId: string;
	setCategoryId: (value: string) => void;
	description: string;
	setDescription: (value: string) => void;
	netAmount: string;
	setNetAmount: (value: string) => void;
	ivaPercent: number;
	setIvaPercent: (value: number) => void;
	totalAmount: number;
	saving: boolean;
	onSubmit: (e: React.FormEvent) => void;
	errors: IncomeExpenseFormErrors;
};

function FieldError({ message }: { message: string }) {
	return <p className="text-destructive text-xs">{message}</p>;
}

export function IncomeExpenseFormDialog({
	open,
	onOpenChange,
	editingEntry,
	entityLabel,
	partyLabel,
	categories,
	activeCategories,
	voucherTypes,
	activeVoucherTypes,
	works,
	parties,
	date,
	setDate,
	voucherNumber,
	setVoucherNumber,
	voucherTypeId,
	setVoucherTypeId,
	workId,
	setWorkId,
	partyId,
	setPartyId,
	categoryId,
	setCategoryId,
	description,
	setDescription,
	netAmount,
	setNetAmount,
	ivaPercent,
	setIvaPercent,
	totalAmount,
	saving,
	onSubmit,
	errors,
}: IncomeExpenseFormDialogProps) {
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
	const voucherTypeOptions = withInactiveSelected(
		activeVoucherTypes,
		voucherTypes,
		voucherTypeId,
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
							<Label htmlFor="ie-date">Fecha</Label>
							<Input
								id="ie-date"
								type="date"
								value={date}
								onChange={(e) => setDate(e.target.value)}
								aria-invalid={!!errors.date}
								required
							/>
							{errors.date && <FieldError message="Elegí una fecha" />}
						</div>
						<div className="space-y-2">
							<Label htmlFor="ie-voucher-number">N° comprobante</Label>
							<Input
								id="ie-voucher-number"
								value={voucherNumber}
								onChange={(e) => setVoucherNumber(e.target.value)}
								maxLength={60}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="ie-voucher-type">Tipo de comprobante</Label>
						<Select value={voucherTypeId} onValueChange={setVoucherTypeId} required>
							<SelectTrigger id="ie-voucher-type" aria-invalid={!!errors.voucherTypeId}>
								<SelectValue placeholder="Selecciona un tipo" />
							</SelectTrigger>
							<SelectContent>
								{voucherTypeOptions.map((voucherType) => (
									<SelectItem key={voucherType.id} value={String(voucherType.id)}>
										{voucherType.name}
										{!voucherType.is_active && ' (inactivo)'}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{errors.voucherTypeId && <FieldError message="Elegí un tipo de comprobante" />}
					</div>

					<div className="space-y-2">
						<Label htmlFor="ie-party">{partyLabel}</Label>
						<EntityCombobox
							id="ie-party"
							value={partyId}
							onValueChange={handlePartyChange}
							options={partyOptions}
							placeholder={`Selecciona un/a ${partyLabel.toLowerCase()}`}
							searchPlaceholder={`Buscar ${partyLabel.toLowerCase()}...`}
							emptyLabel="No se encontraron resultados"
							invalid={!!errors.partyId}
						/>
						{errors.partyId && <FieldError message={`Elegí un ${partyLabel.toLowerCase()}`} />}
					</div>

					<div className="space-y-2">
						<Label htmlFor="ie-work">Obra (opcional)</Label>
						<div className="flex gap-2">
							<div className="flex-1">
								<EntityCombobox
									id="ie-work"
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
						<Label htmlFor="ie-category">Categoría</Label>
						<Select value={categoryId} onValueChange={setCategoryId} required>
							<SelectTrigger id="ie-category" aria-invalid={!!errors.categoryId}>
								<SelectValue placeholder="Selecciona una categoría" />
							</SelectTrigger>
							<SelectContent>
								{categoryOptions.map((category) => (
									<SelectItem key={category.id} value={String(category.id)}>
										{category.name}
										{!category.is_active && ' (inactivo)'}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{errors.categoryId && <FieldError message="Elegí una categoría" />}
					</div>

					<div className="space-y-2">
						<Label htmlFor="ie-description">Detalle</Label>
						<Input
							id="ie-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							maxLength={300}
						/>
					</div>

					<div className="grid gap-4 sm:grid-cols-3">
						<div className="space-y-2">
							<Label htmlFor="ie-net-amount">Neto</Label>
							<Input
								id="ie-net-amount"
								type="text"
								placeholder="0,00"
								value={netAmount}
								onChange={(e) => {
									const formatted = formatNumber(e.target.value);
									// Cap to 2 decimals while typing (DB net_amount check requires it)
									const [intPart, decPart] = formatted.split(',');
									setNetAmount(
										decPart !== undefined ? `${intPart},${decPart.slice(0, 2)}` : formatted
									);
								}}
								aria-invalid={!!errors.netAmount}
								required
							/>
							{errors.netAmount && <FieldError message="Ingresá un monto mayor a 0" />}
						</div>
						<div className="space-y-2">
							<Label htmlFor="ie-iva-percent">IVA %</Label>
							<Select value={String(ivaPercent)} onValueChange={(v) => setIvaPercent(Number(v))}>
								<SelectTrigger id="ie-iva-percent">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{IVA_RATES.map((rate) => (
										<SelectItem key={rate} value={String(rate)}>
											{rate}%
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Total</Label>
							<Input value={formatCurrency(totalAmount)} readOnly disabled />
						</div>
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
