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
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatCurrencyWithoutSymbol, formatNumber } from '@/utils/formats-money';
import type { PurchaseSupplierWithPayments } from '@/lib/suppliers/account-summary';
import type { PaymentSupplier } from '@/lib/suppliers/payments-suppliers';
import type { BankAccount } from '@/lib/cash-flow/cash-flow';
import type { PaymentMethod } from '@/lib/payment-methods/payment-methods';
import { NO_BANK_ACCOUNT, NO_PAYMENT_METHOD } from '@/hooks/suppliers/use-purchase-payment-forms';
import {
	SupplierFileAttachments,
	type StagedFile,
} from '@/components/business/suppliers/supplier-file-attachments';

interface PaymentFormProps {
	editingPayment: PaymentSupplier | null;
	activePurchaseForPayment: PurchaseSupplierWithPayments | null;
	paymentAmount: string;
	onAmountChange: (value: string) => void;
	remainingPurchaseBalance: number;
	paymentExceedsBalance: boolean;
	paymentBankAccountId: string;
	onBankAccountChange: (value: string) => void;
	activeBankAccounts: BankAccount[];
	paymentMethodIdValue: string;
	onPaymentMethodChange: (value: string) => void;
	activePaymentMethods: PaymentMethod[];
	paymentNotes: string;
	onNotesChange: (value: string) => void;
	isSubmitting: boolean;
	stagedFiles: StagedFile[];
	onStagedChange: (files: StagedFile[]) => void;
	onSubmit: (e: React.FormEvent) => void;
	onCancel: () => void;
}

export function PaymentForm({
	editingPayment,
	activePurchaseForPayment,
	paymentAmount,
	onAmountChange,
	remainingPurchaseBalance,
	paymentExceedsBalance,
	paymentBankAccountId,
	onBankAccountChange,
	activeBankAccounts,
	paymentMethodIdValue,
	onPaymentMethodChange,
	activePaymentMethods,
	paymentNotes,
	onNotesChange,
	isSubmitting,
	stagedFiles,
	onStagedChange,
	onSubmit,
	onCancel,
}: PaymentFormProps) {
	return (
		<>
			<DialogHeader>
				<DialogTitle>{editingPayment ? 'Editar pago' : 'Nuevo pago'}</DialogTitle>
				<DialogDescription>
					{editingPayment
						? 'Modifica los datos del pago'
						: `Registra un pago para la compra de ${
								activePurchaseForPayment ? formatCurrency(activePurchaseForPayment.amount_ars) : ''
							}`}
				</DialogDescription>
			</DialogHeader>
			<form onSubmit={onSubmit} className="space-y-4">
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
							className="flex-1"
						/>
						{remainingPurchaseBalance > 0 && (
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
					{paymentExceedsBalance && (
						<p className="text-xs text-amber-600 dark:text-amber-400">
							El monto supera el saldo pendiente de la compra (
							{formatCurrency(remainingPurchaseBalance)}).
						</p>
					)}
				</div>

				<div className="space-y-2">
					<Label htmlFor="payment-bank-account">Cuenta bancaria (opcional)</Label>
					<Select value={paymentBankAccountId} onValueChange={onBankAccountChange}>
						<SelectTrigger id="payment-bank-account">
							<SelectValue placeholder="Selecciona una cuenta" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={NO_BANK_ACCOUNT}>Sin cuenta</SelectItem>
							{activeBankAccounts.map((account) => (
								<SelectItem key={account.id} value={String(account.id)}>
									{account.bank} - {account.name}
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
							{activePaymentMethods.map((method) => (
								<SelectItem key={method.id} value={String(method.id)}>
									{method.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label htmlFor="payment-notes">Notas (opcional)</Label>
					<Textarea
						id="payment-notes"
						value={paymentNotes}
						onChange={(e) => onNotesChange(e.target.value)}
						maxLength={2000}
					/>
				</div>

				<SupplierFileAttachments
					kind="payment"
					entityId={editingPayment?.id}
					staged={stagedFiles}
					onStagedChange={onStagedChange}
				/>

				<div className="flex gap-2">
					<Button type="submit" disabled={isSubmitting} className="flex-1">
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
