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
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Trash2, Edit } from 'lucide-react';
import { BankAccount, deleteBankAccount } from '@/lib/cash-flow/cash-flow';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { getAccountTypeLabel } from '@/constants/cashflow/cashflow';
import { BankAccountForm } from '@/components/business/cash-flow/bank-account-form';

interface BankAccountsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	bankAccounts: BankAccount[];
	onBankAccountsUpdated: () => void;
}

export function BankAccountsDialog({
	open,
	onOpenChange,
	bankAccounts,
	onBankAccountsUpdated,
}: BankAccountsDialogProps) {
	const { toast } = useToast();
	const [isAdding, setIsAdding] = useState(false);
	const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
	const [deletingId, setDeletingId] = useState<number | null>(null);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [loading, setLoading] = useState(false);

	const handleAdd = () => {
		setEditingAccount(null);
		setIsAdding(true);
	};

	const handleEdit = (account: BankAccount) => {
		setEditingAccount(account);
		setIsAdding(true);
	};

	const handleFormSave = async () => {
		setIsAdding(false);
		setEditingAccount(null);
		await onBankAccountsUpdated();
	};

	const handleFormCancel = () => {
		setIsAdding(false);
		setEditingAccount(null);
	};

	const handleDelete = async (id: number) => {
		setDeletingId(id);
		setShowDeleteDialog(true);
	};

	const confirmDelete = async () => {
		if (!deletingId) return;

		setLoading(true);
		try {
			const { error } = await deleteBankAccount(deletingId);
			if (error) throw error;
			toast({
				title: 'Cuenta eliminada',
				description: 'La cuenta bancaria ha sido eliminada correctamente.',
			});
			onBankAccountsUpdated();
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo eliminar la cuenta bancaria.',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
			setDeletingId(null);
			setShowDeleteDialog(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Building2 className="h-5 w-5" />
						Cuentas Bancarias
					</DialogTitle>
					<DialogDescription>Gestiona las cuentas bancarias para transferencias</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{!isAdding && (
						<Button onClick={handleAdd} className="w-full gap-2">
							<Plus className="h-4 w-4" />
							Agregar nueva cuenta
						</Button>
					)}

					{isAdding && (
						<BankAccountForm
							account={editingAccount ?? undefined}
							onSave={handleFormSave}
							onCancel={handleFormCancel}
						/>
					)}

					<div className="space-y-2">
						{bankAccounts.map((account) => (
							<Card key={account.id} className="p-4 bg-card border-border">
								<div className="flex items-center justify-between">
									<div>
										<h4 className="font-semibold text-foreground">{account.name}</h4>
										<p className="text-sm text-muted-foreground">{account.bank}</p>
										<p className="text-sm text-muted-foreground">{account.account_number}</p>
										<Badge variant="secondary" className="mt-2">
											{getAccountTypeLabel(account.account_type)}
										</Badge>
									</div>
									<div className="flex gap-2">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleEdit(account)}
											disabled={isAdding}
										>
											<Edit className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleDelete(account.id)}
											className="text-destructive"
											disabled={isAdding}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</div>
							</Card>
						))}

						{bankAccounts.length === 0 && !isAdding && (
							<p className="text-center text-muted-foreground py-8">
								No hay cuentas bancarias registradas
							</p>
						)}
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cerrar
					</Button>
				</DialogFooter>
			</DialogContent>

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Eliminar cuenta bancaria?</AlertDialogTitle>
						<AlertDialogDescription>
							Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar esta cuenta
							bancaria?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDelete}
							disabled={loading}
							className="bg-destructive text-destructive-foreground"
						>
							{loading ? 'Eliminando...' : 'Eliminar'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Dialog>
	);
}
