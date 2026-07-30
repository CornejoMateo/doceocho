'use client';

import { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { BankAccount } from '@/lib/cash-flow/cash-flow';
import { translateError } from '@/lib/error-translator';
import { formatNumber, parseArsToNumber } from '@/utils/formats-money';
import { createTransaction } from '@/lib/cash-flow/cash-flow';
import { PAYMENT_METHODS } from '@/constants/balances/payment_methods';
import { EXPENSES_CATEGORIES } from '@/constants/cashflow/cashflow';
import { toast } from '@/components/ui/use-toast';

interface TransactionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	type: 'income' | 'expense';
	cashBoxId: number;
	bankAccounts: BankAccount[];
	onTransactionCreated: () => void;
}

export function TransactionDialog({
	open,
	onOpenChange,
	type,
	cashBoxId,
	bankAccounts,
	onTransactionCreated,
}: TransactionDialogProps) {
	const [amount, setAmount] = useState('');
	const [category, setCategory] = useState('');
	const [description, setDescription] = useState('');
	const [bankAccountId, setBankAccountId] = useState<string>('');
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!amount || !category) {
			toast({
				variant: 'destructive',
				title: 'Error',
				description: 'Por favor completa todos los campos requeridos.',
			});
			return;
		}
		const parsedAmount = parseArsToNumber(amount);
		if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

		setLoading(true);
		try {
			const transactionData: any = {
				cash_box_id: cashBoxId,
				type,
				amount: parsedAmount,
				category,
				description: description || null,
				bank_account_id:
					category === 'bank_transfer' && bankAccountId ? Number(bankAccountId) : null,
			};

			const { error } = await createTransaction(transactionData);
			if (error) throw error;

			toast({
				title: type === 'income' ? 'Ingreso registrado' : 'Egreso registrado',
				description: `La transacción fue registrada correctamente en la caja.`,
			});
			onTransactionCreated();
			resetForm();
		} catch (error) {
			translateError(error);
		} finally {
			setLoading(false);
		}
	};

	const resetForm = () => {
		setAmount('');
		setCategory('');
		setDescription('');
		setBankAccountId('');
	};

	const categories = type === 'income' ? PAYMENT_METHODS : EXPENSES_CATEGORIES;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px] w-full">
				<DialogHeader>
					<DialogTitle>{type === 'income' ? 'Registrar Ingreso' : 'Registrar Egreso'}</DialogTitle>
					<DialogDescription>
						{type === 'income'
							? 'Registra un nuevo ingreso a la caja actual'
							: 'Registra un nuevo egreso de la caja actual'}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="min-w-0">
					<div className="space-y-4 py-4 min-w-0">
						<div className="space-y-2">
							<Label htmlFor="amount">Monto</Label>
							<Input
								id="amount"
								type="text"
								step="0.01"
								min="0"
								placeholder="0.00"
								value={amount}
								onChange={(e) => setAmount(formatNumber(e.target.value))}
								required
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="category">{type === 'income' ? 'Método de pago' : 'Categoría'}</Label>
							<Select value={category} onValueChange={setCategory} required>
								<SelectTrigger>
									<SelectValue
										placeholder={
											type === 'income'
												? 'Selecciona un método de pago'
												: 'Selecciona una categoría'
										}
									/>
								</SelectTrigger>
								<SelectContent>
									{categories.map((cat) => (
										<SelectItem key={cat.value} value={cat.value}>
											{cat.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{category === 'bank_transfer' && (
							<div className="space-y-2 min-w-0">
								<Label htmlFor="bankAccount">Cuenta Bancaria</Label>
								<Select value={bankAccountId} onValueChange={setBankAccountId}>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Selecciona una cuenta" />
									</SelectTrigger>
									<SelectContent>
										{bankAccounts.map((account) => (
											<SelectItem key={account.id} value={String(account.id)}>
												{account.bank} - {account.name} ({account.account_number})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}

						<div className="space-y-2">
							<Label htmlFor="description">Descripción (opcional)</Label>
							<Input
								id="description"
								placeholder="Descripción del movimiento"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								onOpenChange(false);
								resetForm();
							}}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={loading}>
							{loading ? 'Guardando...' : 'Guardar'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
