import { Button } from '@/components/ui/button';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatNumber } from '@/utils/formats-money';
import { IVA_RATES } from '@/constants/cashflow/iva';
import type { SupplierExpenseListItem } from '@/lib/suppliers/supplier-expenses';
import type { BankAccount } from '@/lib/cash-flow/cash-flow';
import type { PaymentMethod } from '@/lib/payment-methods/payment-methods';
import type { CashFlowCategory } from '@/lib/categories/categories';
import type { Work } from '@/lib/works/works';
import type { VoucherType } from '@/lib/voucher-types/voucher-types';
import {
	NO_BANK_ACCOUNT,
	NO_WORK,
	NO_CATEGORY,
	NO_PAYMENT_METHOD,
	NO_VOUCHER_TYPE,
} from '@/hooks/suppliers/use-purchase-payment-forms';
import { withInactiveSelected } from '@/utils/select-options';
import { EntityCombobox } from '@/components/business/cash-flow/shared/entity-combobox';
import {
	FileAttachments,
	type StagedFile,
} from '@/components/business/shared/attachments/file-attachments';

interface PurchaseFormProps {
	editingPurchase: SupplierExpenseListItem | null;
	supplierName: string;
	purchaseDate: string;
	onDateChange: (value: string) => void;
	purchaseVoucherTypeId: string;
	onVoucherTypeIdChange: (value: string) => void;
	voucherTypes: VoucherType[];
	activeVoucherTypes: VoucherType[];
	purchaseVoucherNumber: string;
	onVoucherNumberChange: (value: string) => void;
	purchaseWorkId: string;
	onWorkIdChange: (value: string) => void;
	works: Work[];
	purchaseCategoryId: string;
	onCategoryIdChange: (value: string) => void;
	expenseCategories: CashFlowCategory[];
	activeExpenseCategories: CashFlowCategory[];
	purchaseDescription: string;
	onDescriptionChange: (value: string) => void;
	purchaseNetAmount: string;
	onNetAmountChange: (value: string) => void;
	purchaseIvaPercent: number;
	onIvaPercentChange: (value: number) => void;
	purchaseTotalAmount: number;
	purchaseBankAccountId: string;
	onBankAccountChange: (value: string) => void;
	bankAccounts: BankAccount[];
	activeBankAccounts: BankAccount[];
	purchasePaymentMethodId: string;
	onPaymentMethodChange: (value: string) => void;
	paymentMethods: PaymentMethod[];
	activePaymentMethods: PaymentMethod[];
	isSubmitting: boolean;
	stagedFiles: StagedFile[];
	onStagedChange: (files: StagedFile[]) => void;
	onSubmit: (e: React.FormEvent) => void;
	onCancel: () => void;
}

export function PurchaseForm({
	editingPurchase,
	supplierName,
	purchaseDate,
	onDateChange,
	purchaseVoucherTypeId,
	onVoucherTypeIdChange,
	voucherTypes,
	activeVoucherTypes,
	purchaseVoucherNumber,
	onVoucherNumberChange,
	purchaseWorkId,
	onWorkIdChange,
	works,
	purchaseCategoryId,
	onCategoryIdChange,
	expenseCategories,
	activeExpenseCategories,
	purchaseDescription,
	onDescriptionChange,
	purchaseNetAmount,
	onNetAmountChange,
	purchaseIvaPercent,
	onIvaPercentChange,
	purchaseTotalAmount,
	purchaseBankAccountId,
	onBankAccountChange,
	bankAccounts,
	activeBankAccounts,
	purchasePaymentMethodId,
	onPaymentMethodChange,
	paymentMethods,
	activePaymentMethods,
	isSubmitting,
	stagedFiles,
	onStagedChange,
	onSubmit,
	onCancel,
}: PurchaseFormProps) {
	const workOptions = works.map((work) => ({
		id: work.id,
		label: work.name || `Obra #${work.id}`,
	}));
	const categoryOptions = withInactiveSelected(
		activeExpenseCategories,
		expenseCategories,
		purchaseCategoryId,
		!!editingPurchase
	);
	const voucherTypeOptions = withInactiveSelected(
		activeVoucherTypes,
		voucherTypes,
		purchaseVoucherTypeId,
		!!editingPurchase
	);
	// Keeps a since-deactivated payment method/bank account selectable while editing (same pattern
	// as income-expense-form-dialog.tsx), instead of showing the Select blank.
	const paymentMethodOptions = withInactiveSelected(
		activePaymentMethods,
		paymentMethods,
		purchasePaymentMethodId,
		!!editingPurchase
	);
	const bankAccountOptions = withInactiveSelected(
		activeBankAccounts,
		bankAccounts,
		purchaseBankAccountId,
		!!editingPurchase
	);
	return (
		<>
			<DialogHeader>
				<DialogTitle>{editingPurchase ? 'Editar compra' : 'Nueva compra'}</DialogTitle>
				<DialogDescription>
					{editingPurchase
						? 'Modifica los datos de la compra'
						: `Registra una nueva compra para ${supplierName}`}
				</DialogDescription>
			</DialogHeader>
			<form onSubmit={onSubmit} className="min-w-0 space-y-4">
				<div className="space-y-2">
					<Label htmlFor="purchase-date">Fecha</Label>
					<Input
						id="purchase-date"
						type="date"
						value={purchaseDate}
						onChange={(e) => onDateChange(e.target.value)}
						required
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="purchase-voucher-type">Tipo de comprobante (opcional)</Label>
					<Select
						value={purchaseVoucherTypeId}
						onValueChange={(v) =>
							onVoucherTypeIdChange(v === NO_VOUCHER_TYPE ? NO_VOUCHER_TYPE : v)
						}
					>
						<SelectTrigger id="purchase-voucher-type">
							<SelectValue placeholder="Selecciona un tipo" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={NO_VOUCHER_TYPE}>Sin tipo de comprobante</SelectItem>
							{voucherTypeOptions.map((voucherType) => (
								<SelectItem key={voucherType.id} value={String(voucherType.id)}>
									{voucherType.name}
									{!voucherType.is_active && ' (inactivo)'}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label htmlFor="purchase-voucher-number">N° comprobante (opcional)</Label>
					<Input
						id="purchase-voucher-number"
						value={purchaseVoucherNumber}
						onChange={(e) => onVoucherNumberChange(e.target.value)}
						maxLength={60}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="purchase-work">Obra (opcional)</Label>
					<div className="flex gap-2">
						<div className="flex-1">
							<EntityCombobox
								id="purchase-work"
								value={purchaseWorkId === NO_WORK ? '' : purchaseWorkId}
								onValueChange={(value) => onWorkIdChange(value || NO_WORK)}
								options={workOptions}
								placeholder="Sin obra"
								searchPlaceholder="Buscar obra..."
								emptyLabel="No se encontraron obras"
							/>
						</div>
						{purchaseWorkId !== NO_WORK && (
							<Button type="button" variant="outline" onClick={() => onWorkIdChange(NO_WORK)}>
								Quitar
							</Button>
						)}
					</div>
				</div>

				<div className="space-y-2">
					<Label htmlFor="purchase-category">Categoría (opcional)</Label>
					<Select
						value={purchaseCategoryId}
						onValueChange={(v) => onCategoryIdChange(v === NO_CATEGORY ? NO_CATEGORY : v)}
					>
						<SelectTrigger id="purchase-category">
							<SelectValue placeholder="Selecciona una categoría" />
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
					<Label htmlFor="purchase-description">Detalle</Label>
					<Input
						id="purchase-description"
						value={purchaseDescription}
						onChange={(e) => onDescriptionChange(e.target.value)}
						maxLength={2000}
					/>
				</div>

				<div className="grid gap-4 sm:grid-cols-3">
					<div className="space-y-2">
						<Label htmlFor="purchase-net-amount">Neto</Label>
						<Input
							id="purchase-net-amount"
							type="text"
							placeholder="0,00"
							value={purchaseNetAmount}
							onChange={(e) => {
								const formatted = formatNumber(e.target.value);
								// Cap to 2 decimals while typing (DB net_amount check requires it)
								const [intPart, decPart] = formatted.split(',');
								onNetAmountChange(
									decPart !== undefined ? `${intPart},${decPart.slice(0, 2)}` : formatted
								);
							}}
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="purchase-iva-percent">IVA %</Label>
						<Select
							value={String(purchaseIvaPercent)}
							onValueChange={(v) => onIvaPercentChange(Number(v))}
						>
							<SelectTrigger id="purchase-iva-percent">
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
						<Input value={formatCurrency(purchaseTotalAmount)} readOnly disabled />
					</div>
				</div>

				<div className="space-y-2">
					<Label htmlFor="purchase-payment-method">Medio de pago (opcional)</Label>
					<Select value={purchasePaymentMethodId} onValueChange={onPaymentMethodChange}>
						<SelectTrigger id="purchase-payment-method">
							<SelectValue placeholder="Selecciona un medio" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={NO_PAYMENT_METHOD}>Sin medio</SelectItem>
							{paymentMethodOptions.map((method) => (
								<SelectItem key={method.id} value={String(method.id)}>
									{method.name}
									{!method.is_active && ' (inactivo)'}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label htmlFor="purchase-bank-account">Cuenta bancaria (opcional)</Label>
					<Select value={purchaseBankAccountId} onValueChange={onBankAccountChange}>
						<SelectTrigger id="purchase-bank-account">
							<SelectValue placeholder="Selecciona una cuenta" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={NO_BANK_ACCOUNT}>Sin cuenta</SelectItem>
							{bankAccountOptions.map((account) => (
								<SelectItem key={account.id} value={String(account.id)}>
									{account.bank} - {account.name}
									{!account.is_active && ' (inactiva)'}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<FileAttachments
					kind="expense"
					entityId={editingPurchase?.id}
					staged={stagedFiles}
					onStagedChange={onStagedChange}
					editKey="cash-flow.suppliers"
				/>

				<div className="flex gap-2">
					<Button type="submit" disabled={isSubmitting} className="flex-1">
						{isSubmitting ? 'Guardando...' : editingPurchase ? 'Actualizar' : 'Crear'}
					</Button>
					<Button type="button" variant="outline" onClick={onCancel}>
						{editingPurchase ? 'Volver' : 'Cancelar'}
					</Button>
				</div>
			</form>
		</>
	);
}
