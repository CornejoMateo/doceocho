'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { BankAccount, createBankAccount, updateBankAccount } from '@/lib/cash-flow/cash-flow';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { ACCOUNT_TYPES } from '@/constants/cashflow/cashflow';

interface BankAccountFormProps {
	account?: BankAccount;
	onSave: () => Promise<void>;
	onCancel: () => void;
}

export function BankAccountForm({ account, onSave, onCancel }: BankAccountFormProps) {
	const { toast } = useToast();
	const [name, setName] = useState(account?.name ?? '');
	const [bank, setBank] = useState(account?.bank ?? '');
	const [accountNumber, setAccountNumber] = useState(account?.account_number ?? '');
	const [accountType, setAccountType] = useState(account?.account_type ?? '');
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmedName = name.trim();
		const trimmedBank = bank.trim();
		const trimmedAccountNumber = accountNumber.trim();
		if (!trimmedName || !trimmedBank || !trimmedAccountNumber || !accountType) {
			toast({
				title: 'Datos incompletos',
				description: 'Completa el nombre, el banco, el número y el tipo de cuenta.',
				variant: 'destructive',
			});
			return;
		}
		setIsSubmitting(true);
		try {
			if (account) {
				const { error } = await updateBankAccount(account.id, {
					name: trimmedName,
					bank: trimmedBank,
					account_number: trimmedAccountNumber,
					account_type: accountType,
				});
				if (error) throw error;
				toast({
					title: 'Cuenta actualizada',
					description: 'La cuenta bancaria ha sido actualizada correctamente.',
				});
			} else {
				const { error } = await createBankAccount({
					name: trimmedName,
					bank: trimmedBank,
					account_number: trimmedAccountNumber,
					account_type: accountType,
					is_active: true,
				});
				if (error) throw error;
				toast({
					title: 'Cuenta creada',
					description: 'La cuenta bancaria ha sido creada correctamente.',
				});
			}
			await onSave();
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo guardar la cuenta bancaria.',
				variant: 'destructive',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Card className="p-4 bg-card border-border">
			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="name">Nombre de la Cuenta</Label>
					<Input
						id="name"
						placeholder="Ej: Cuenta Principal"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="bank">Banco</Label>
					<Input
						id="bank"
						placeholder="Ej: Banco Galicia"
						value={bank}
						onChange={(e) => setBank(e.target.value)}
						required
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="accountNumber">Número de Cuenta</Label>
					<Input
						id="accountNumber"
						placeholder="Ej: 1234-5678-9012"
						value={accountNumber}
						onChange={(e) => setAccountNumber(e.target.value)}
						required
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="accountType">Tipo de Cuenta</Label>
					<Select value={accountType} onValueChange={setAccountType} required>
						<SelectTrigger>
							<SelectValue placeholder="Selecciona el tipo" />
						</SelectTrigger>
						<SelectContent>
							{ACCOUNT_TYPES.map((type) => (
								<SelectItem key={type.value} value={type.value}>
									{type.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="flex gap-2">
					<Button type="submit" disabled={isSubmitting} className="flex-1">
						{isSubmitting ? 'Guardando...' : account ? 'Actualizar' : 'Crear'}
					</Button>
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancelar
					</Button>
				</div>
			</form>
		</Card>
	);
}
