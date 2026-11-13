import { Button } from '@/components/ui/button';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatCurrencyWithoutSymbol, formatNumber } from '@/utils/formats-money';
import type { SupplierExpenseListItem } from '@/lib/suppliers/supplier-expenses';
import type { PaymentWithDetails } from '@/lib/payments/payments';
import type { BankAccount } from '@/lib/cash-flow/cash-flow';
import type { PaymentMethod } from '@/lib/payment-methods/payment-methods';
import type { CashFlowCategory } from '@/lib/categories/categories';
import type { Withholding } from '@/lib/withholdings/withholdings';
import {
	NO_BANK_ACCOUNT,
	NO_PAYMENT_METHOD,
	NO_CATEGORY,
} from '@/hooks/suppliers/use-purchase-payment-forms';
import { withInactiveSelected } from '@/utils/select-options';
import {
	FileAttachments,
	type StagedFile,
} from '@/components/business/shared/attachments/file-attachments';

interface PaymentFormProps {
	editingPayment: PaymentWithDetails | null;
	activePurchaseForPayment: SupplierExpenseListItem | null;
	paymentAmount: string;
	onAmountChange: (value: string) => void;
	paymentDate: string;
	onDateChange: (value: string) => void;
	remainingPurchaseBalance: number;
	paymentExceedsBalance: boolean;
	paymentBankAccountId: string;
	onBankAccountChange: (value: string) => void;
	bankAccounts: BankAccount[];
	activeBankAccounts: BankAccount[];
	paymentMethodIdValue: string;
	onPaymentMethodChange: (value: string) => void;
	paymentMethods: PaymentMethod[];
	activePaymentMethods: PaymentMethod[];
	paymentReceiptNumber: string;
	onReceiptNumberChange: (value: string) => void;
	paymentCategoryId: string;
	onCategoryIdChange: (value: string) => void;
	paymentCategories: CashFlowCategory[];
	activePaymentCategories: CashFlowCategory[];
	paymentDescription: string;
	onDescriptionChange: (value: string) => void;
	isSubmitting: boolean;
	stagedFiles: StagedFile[];
	onStagedChange: (files: StagedFile[]) => void;
	onSubmit: (e: React.FormEvent) => void;
	onCancel: () => void;
	withholdingEnabled: boolean;
	onWithholdingEnabledChange: (checked: boolean) => void;
	withholdingRegime: string;
	onWithholdingRegimeChange: (value: string) => void;
	withholdingRatePercent: string;
	onWithholdingRatePercentChange: (value: string) => void;
	withholdingImputedAmount: string;
	onWithholdingImputedAmountChange: (value: string) => void;
	withholdingPreviewWithheld: number;
	withholdingPreviewTotal: number;
	existingWithholding: Withholding | null;
	loadingExistingWithholding: boolean;
}

export function PaymentForm({
	editingPayment,
	activePurchaseForPayment,
	paymentAmount,
	onAmountChange,
	paymentDate,
	onDateChange,
	remainingPurchaseBalance,
	paymentExceedsBalance,
	paymentBankAccountId,
	onBankAccountChange,
	bankAccounts,
	activeBankAccounts,
	paymentMethodIdValue,
	onPaymentMethodChange,
	paymentMethods,
	activePaymentMethods,
	paymentReceiptNumber,
	onReceiptNumberChange,
	paymentCategoryId,
	onCategoryIdChange,
	paymentCategories,
	activePaymentCategories,
	paymentDescription,
	onDescriptionChange,
	isSubmitting,
	stagedFiles,
	onStagedChange,
	onSubmit,
	onCancel,
	withholdingEnabled,
	onWithholdingEnabledChange,
	withholdingRegime,
	onWithholdingRegimeChange,
	withholdingRatePercent,
	onWithholdingRatePercentChange,
	withholdingImputedAmount,
	onWithholdingImputedAmountChange,
	withholdingPreviewWithheld,
	withholdingPreviewTotal,
	existingWithholding,
	loadingExistingWithholding,
}: PaymentFormProps) {
	// Locked while we don't yet know (loading) or while a withholding exists: the amount can never change then.
	const isAmountLocked = !!editingPayment && (loadingExistingWithholding || !!existingWithholding);
	// Disabled while the withholding lookup is in flight, so the user can't submit before we know if one exists.
	const isSubmitDisabled = isSubmitting || (!!editingPayment && loadingExistingWithholding);
	const categoryOptions = withInactiveSelected(
		activePaymentCategories,
		paymentCategories,
		paymentCategoryId,
		!!editingPayment
	);

	const bankAccountOptions = withInactiveSelected(
		activeBankAccounts,
		bankAccounts,
		paymentBankAccountId,
		!!editingPayment
	);
	const paymentMethodOptions = withInactiveSelected(
		activePaymentMethods,
		paymentMethods,
		paymentMethodIdValue,
		!!editingPayment
	);
	return (
		<>
			<DialogHeader>
				<DialogTitle>{editingPayment ? 'Editar pago' : 'Nuevo pago'}</DialogTitle>
				<DialogDescription>
					{editingPayment
						? 'Modifica los datos del pago'
						: `Registra un pago para la compra de ${
								activePurchaseForPayment
									? formatCurrency(activePurchaseForPayment.total_amount)
									: ''
							}`}
				</DialogDescription>
			</DialogHeader>
			<form onSubmit={onSubmit} className="min-w-0 space-y-4">
				<div className="space-y-2">
					<Label htmlFor="payment-date">Fecha de pago</Label>
					<Input
						id="payment-date"
						type="date"
						value={paymentDate}
						onChange={(e) => onDateChange(e.target.value)}
						required
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="payment-amount">Monto</Label>
					<div className="flex gap-2">
						<Input
							id="payment-amount"
							type="text"
							placeholder="0,00"
							value={paymentAmount}
							onChange={(e) => onAmountChange(formatNumber(e.target.value))}
							required
							disabled={isAmountLocked}
							className="flex-1"
						/>
						{!isAmountLocked && remainingPurchaseBalance > 0 && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="min-h-11 shrink-0 sm:min-h-9"
								onClick={() =>
									onAmountChange(formatCurrencyWithoutSymbol(remainingPurchaseBalance))
								}
							>
								Registrar pago total ({formatCurrency(remainingPurchaseBalance)})
							</Button>
						)}
					</div>
					{!isAmountLocked && paymentExceedsBalance && (
						<p className="text-xs text-amber-600 dark:text-amber-400">
							El monto supera el saldo pendiente de la compra (
							{formatCurrency(remainingPurchaseBalance)}).
						</p>
					)}
				</div>

				{!editingPayment && (
					<div className="space-y-3 rounded-lg border border-border p-3">
						<div className="flex items-center gap-2">
							<Switch
								id="payment-withholding-enabled"
								checked={withholdingEnabled}
								onCheckedChange={onWithholdingEnabledChange}
							/>
							<Label htmlFor="payment-withholding-enabled">Aplicar retención</Label>
						</div>
						{withholdingEnabled && (
							<div className="space-y-3">
								<div className="space-y-2">
									<Label htmlFor="withholding-regime">Régimen</Label>
									<Input
										id="withholding-regime"
										value={withholdingRegime}
										onChange={(e) => onWithholdingRegimeChange(e.target.value)}
										maxLength={120}
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="withholding-rate">Alícuota (%)</Label>
									<Input
										id="withholding-rate"
										type="number"
										min={0}
										max={100}
										step="0.01"
										value={withholdingRatePercent}
										onChange={(e) => onWithholdingRatePercentChange(e.target.value)}
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="withholding-imputed">Imputado</Label>
									<Input
										id="withholding-imputed"
										type="text"
										placeholder="0,00"
										value={withholdingImputedAmount}
										onChange={(e) => onWithholdingImputedAmountChange(formatNumber(e.target.value))}
										required
									/>
								</div>
								<div className="grid grid-cols-2 gap-3 text-sm">
									<div>
										<p className="text-muted-foreground">Retenido</p>
										<p className="font-medium">{formatCurrency(withholdingPreviewWithheld)}</p>
									</div>
									<div>
										<p className="text-muted-foreground">Total</p>
										<p className="font-medium">{formatCurrency(withholdingPreviewTotal)}</p>
									</div>
								</div>
							</div>
						)}
					</div>
				)}

				{editingPayment && (loadingExistingWithholding || existingWithholding) && (
					<div className="space-y-3 rounded-lg border border-border p-3 text-sm">
						{loadingExistingWithholding ? (
							<p className="text-muted-foreground">Cargando datos de retención...</p>
						) : (
							existingWithholding && (
								<>
									<p className="text-muted-foreground">
										Este pago tiene una retención: para cambiar el monto, eliminá el pago y creálo
										de nuevo.
									</p>
									<div className="grid grid-cols-2 gap-3">
										<div>
											<p className="text-muted-foreground">Régimen</p>
											<p className="font-medium">{existingWithholding.tax_regime}</p>
										</div>
										<div>
											<p className="text-muted-foreground">Alícuota</p>
											<p className="font-medium">
												{(existingWithholding.rate * 100).toLocaleString('es-AR')}%
											</p>
										</div>
										<div>
											<p className="text-muted-foreground">Imputado</p>
											<p className="font-medium">
												{formatCurrency(existingWithholding.imputed_amount)}
											</p>
										</div>
										<div>
											<p className="text-muted-foreground">Retenido</p>
											<p className="font-medium">
												{formatCurrency(existingWithholding.withheld_amount)}
											</p>
										</div>
									</div>
								</>
							)
						)}
					</div>
				)}

				<div className="space-y-2">
					<Label htmlFor="payment-bank-account">Cuenta bancaria (opcional)</Label>
					<Select value={paymentBankAccountId} onValueChange={onBankAccountChange}>
						<SelectTrigger id="payment-bank-account">
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

				<div className="space-y-2">
					<Label htmlFor="payment-method">Método de pago (opcional)</Label>
					<Select value={paymentMethodIdValue} onValueChange={onPaymentMethodChange}>
						<SelectTrigger id="payment-method">
							<SelectValue placeholder="Selecciona un método" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={NO_PAYMENT_METHOD}>Sin método</SelectItem>
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
					<Label htmlFor="payment-receipt-number">N° comprobante (opcional)</Label>
					<Input
						id="payment-receipt-number"
						value={paymentReceiptNumber}
						onChange={(e) => onReceiptNumberChange(e.target.value)}
						maxLength={60}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="payment-category">Categoría (opcional)</Label>
					<Select
						value={paymentCategoryId}
						onValueChange={(v) => onCategoryIdChange(v === NO_CATEGORY ? NO_CATEGORY : v)}
					>
						<SelectTrigger id="payment-category">
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
					<Label htmlFor="payment-description">Detalle (opcional)</Label>
					<Textarea
						id="payment-description"
						value={paymentDescription}
						onChange={(e) => onDescriptionChange(e.target.value)}
						maxLength={2000}
					/>
				</div>

				<FileAttachments
					kind="payment"
					entityId={editingPayment?.id}
					staged={stagedFiles}
					onStagedChange={onStagedChange}
					editKey="cash-flow.suppliers"
				/>

				<div className="flex gap-2">
					<Button type="submit" disabled={isSubmitDisabled} className="flex-1">
						{isSubmitting ? 'Guardando...' : editingPayment ? 'Actualizar' : 'Crear'}
					</Button>
					<Button type="button" variant="outline" onClick={onCancel}>
						{editingPayment ? 'Volver' : 'Cancelar'}
					</Button>
				</div>
			</form>
		</>
	);
}
