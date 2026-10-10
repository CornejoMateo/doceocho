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
import { FixedExpenseWithCategory } from '@/lib/fixed-expenses/fixed-expenses';
import { FixedExpensePaymentWithDetails } from '@/lib/fixed-expenses/fixed-expense-payments';
import { PaymentMethod } from '@/lib/payment-methods/payment-methods';
import { BankAccount } from '@/lib/cash-flow/cash-flow';
import { IVA_RATES } from '@/constants/cashflow/fixed-expenses';
import { formatCurrency, formatNumber } from '@/utils/formats-money';

type FixedExpensePaymentDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	expenseToPay: FixedExpenseWithCategory | null;
	paymentToEdit: FixedExpensePaymentWithDetails | null;
	paymentMonth: string;
	setPaymentMonth: (value: string) => void;
	paymentDate: string;
	setPaymentDate: (value: string) => void;
	paymentNet: string;
	setPaymentNet: (value: string) => void;
	paymentIvaPercent: string;
	setPaymentIvaPercent: (value: string) => void;
	paymentTotal: number;
	paymentMethodId: string;
	setPaymentMethodId: (value: string) => void;
	activePaymentMethods: PaymentMethod[];
	paymentBankAccountId: string;
	setPaymentBankAccountId: (value: string) => void;
	bankAccounts: BankAccount[];
	payingSaving: boolean;
	onSubmit: (e: React.FormEvent) => void;
};

export function FixedExpensePaymentDialog({
	open,
	onOpenChange,
	expenseToPay,
	paymentToEdit,
	paymentMonth,
	setPaymentMonth,
	paymentDate,
	setPaymentDate,
	paymentNet,
	setPaymentNet,
	paymentIvaPercent,
	setPaymentIvaPercent,
	paymentTotal,
	paymentMethodId,
	setPaymentMethodId,
	activePaymentMethods,
	paymentBankAccountId,
	setPaymentBankAccountId,
	bankAccounts,
	payingSaving,
	onSubmit,
}: FixedExpensePaymentDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{paymentToEdit ? 'Editar pago' : 'Registrar pago'}</DialogTitle>
					<DialogDescription>
						{paymentToEdit
							? `Modifica los datos del pago de ${paymentToEdit.description}.`
							: expenseToPay && `Registra el pago de ${expenseToPay.description}.`}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={onSubmit} className="space-y-4">
					{paymentToEdit && (
						<div className="space-y-2">
							<Label htmlFor="payment-concept">Concepto</Label>
							<Input id="payment-concept" value={paymentToEdit.description} readOnly disabled />
						</div>
					)}
					<div className="space-y-2">
						<Label htmlFor="payment-period">Mes</Label>
						<Input
							id="payment-period"
							type="month"
							value={paymentMonth}
							onChange={(e) => setPaymentMonth(e.target.value)}
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="payment-date">Fecha de pago</Label>
						<Input
							id="payment-date"
							type="date"
							value={paymentDate}
							onChange={(e) => setPaymentDate(e.target.value)}
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="payment-net">Neto</Label>
						<Input
							id="payment-net"
							type="text"
							placeholder="0,00"
							value={paymentNet}
							onChange={(e) => setPaymentNet(formatNumber(e.target.value))}
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="payment-iva">IVA %</Label>
						<Select value={paymentIvaPercent} onValueChange={setPaymentIvaPercent} required>
							<SelectTrigger id="payment-iva">
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
						<Label htmlFor="payment-total">Total</Label>
						<Input id="payment-total" type="text" value={formatCurrency(paymentTotal)} readOnly />
					</div>
					<div className="space-y-2">
						<Label htmlFor="payment-method">Medio de pago</Label>
						<Select value={paymentMethodId} onValueChange={setPaymentMethodId} required>
							<SelectTrigger id="payment-method">
								<SelectValue placeholder="Selecciona un medio de pago" />
							</SelectTrigger>
							<SelectContent>
								{activePaymentMethods.map((method) => (
									<SelectItem key={method.id} value={String(method.id)}>
										{method.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="payment-bank-account">Cuenta bancaria</Label>
						<Select value={paymentBankAccountId} onValueChange={setPaymentBankAccountId}>
							<SelectTrigger id="payment-bank-account">
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
						<Button type="submit" disabled={payingSaving} className="flex-1">
							{payingSaving ? 'Guardando...' : paymentToEdit ? 'Guardar cambios' : 'Registrar pago'}
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
