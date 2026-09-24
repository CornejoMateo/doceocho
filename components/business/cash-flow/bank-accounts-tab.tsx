'use client';

import { useMemo, useState } from 'react';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Dialog,
	DialogContent,
	DialogDescription,
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
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Plus, Edit, Ban, RotateCcw } from 'lucide-react';
import { BankAccount, updateBankAccount } from '@/lib/cash-flow/cash-flow';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { getAccountTypeLabel } from '@/constants/cashflow/cashflow';
import { BankAccountForm } from '@/components/business/cash-flow/bank-account-form';

interface BankAccountsTabProps {
	bankAccounts: BankAccount[];
	onBankAccountsUpdated: () => void | Promise<void>;
}

export function BankAccountsTab({ bankAccounts, onBankAccountsUpdated }: BankAccountsTabProps) {
	const { toast } = useToast();
	const [showInactive, setShowInactive] = useState(false);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
	const [accountToDeactivate, setAccountToDeactivate] = useState<BankAccount | null>(null);
	const [loading, setLoading] = useState(false);

	const visibleAccounts = useMemo(
		() => (showInactive ? bankAccounts : bankAccounts.filter((a) => a.is_active)),
		[bankAccounts, showInactive]
	);

	const handleAdd = () => {
		setEditingAccount(null);
		setIsFormOpen(true);
	};

	const handleEdit = (account: BankAccount) => {
		setEditingAccount(account);
		setIsFormOpen(true);
	};

	const handleFormSave = async () => {
		setIsFormOpen(false);
		setEditingAccount(null);
		await onBankAccountsUpdated();
	};

	const handleFormOpenChange = (open: boolean) => {
		setIsFormOpen(open);
		if (!open) setEditingAccount(null);
	};

	const confirmDeactivate = async () => {
		if (!accountToDeactivate) return;
		setLoading(true);
		try {
			const { error } = await updateBankAccount(accountToDeactivate.id, { is_active: false });
			if (error) throw error;
			toast({
				title: 'Cuenta desactivada',
				description: 'La cuenta bancaria ha sido desactivada correctamente.',
			});
			await onBankAccountsUpdated();
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo desactivar la cuenta bancaria.',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
			setAccountToDeactivate(null);
		}
	};

	const handleReactivate = async (account: BankAccount) => {
		setLoading(true);
		try {
			const { error } = await updateBankAccount(account.id, { is_active: true });
			if (error) throw error;
			toast({
				title: 'Cuenta reactivada',
				description: 'La cuenta bancaria ha sido reactivada correctamente.',
			});
			await onBankAccountsUpdated();
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo reactivar la cuenta bancaria.',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	const renderActions = (account: BankAccount, withLabel: boolean) => {
		const size = withLabel ? 'default' : 'sm';
		const buttonClass = withLabel ? 'flex-1 gap-2' : '';
		return (
			<>
				<Button
					variant={withLabel ? 'outline' : 'ghost'}
					size={size}
					aria-label="Editar"
					title="Editar"
					className={buttonClass}
					onClick={() => handleEdit(account)}
					disabled={loading}
				>
					<Edit className="h-4 w-4" />
					{withLabel && 'Editar'}
				</Button>
				{account.is_active ? (
					<Button
						variant={withLabel ? 'outline' : 'ghost'}
						size={size}
						aria-label="Desactivar"
						title="Desactivar"
						className={`text-destructive ${buttonClass}`}
						onClick={() => setAccountToDeactivate(account)}
						disabled={loading}
					>
						<Ban className="h-4 w-4" />
						{withLabel && 'Desactivar'}
					</Button>
				) : (
					<Button
						variant={withLabel ? 'outline' : 'ghost'}
						size={size}
						aria-label="Reactivar"
						title="Reactivar"
						className={buttonClass}
						onClick={() => handleReactivate(account)}
						disabled={loading}
					>
						<RotateCcw className="h-4 w-4" />
						{withLabel && 'Reactivar'}
					</Button>
				)}
			</>
		);
	};

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-2">
					<Switch
						id="show-inactive-accounts"
						checked={showInactive}
						onCheckedChange={setShowInactive}
					/>
					<Label htmlFor="show-inactive-accounts">Mostrar inactivas</Label>
				</div>
				<Button onClick={handleAdd} className="gap-2">
					<Plus className="h-4 w-4" />
					Nueva cuenta
				</Button>
			</div>

			{visibleAccounts.length === 0 ? (
				<Card className="bg-card border-border p-8 text-center text-muted-foreground">
					No hay cuentas bancarias registradas
				</Card>
			) : (
				<>
					<div className="hidden md:block" data-testid="bank-accounts-desktop">
						<Card className="bg-card border-border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Nombre</TableHead>
										<TableHead>Banco</TableHead>
										<TableHead>N° de cuenta</TableHead>
										<TableHead>Tipo</TableHead>
										<TableHead>Estado</TableHead>
										<TableHead className="text-right">Acciones</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{visibleAccounts.map((account) => (
										<TableRow key={account.id}>
											<TableCell className="font-medium">{account.name}</TableCell>
											<TableCell>{account.bank}</TableCell>
											<TableCell>{account.account_number}</TableCell>
											<TableCell>
												<Badge variant="secondary">
													{getAccountTypeLabel(account.account_type)}
												</Badge>
											</TableCell>
											<TableCell>
												<Badge variant={account.is_active ? 'default' : 'outline'}>
													{account.is_active ? 'Activa' : 'Inactiva'}
												</Badge>
											</TableCell>
											<TableCell className="text-right">
												<div className="flex justify-end gap-2">
													{renderActions(account, false)}
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</Card>
					</div>

					<div className="md:hidden space-y-3" data-testid="bank-accounts-mobile">
						{visibleAccounts.map((account) => (
							<Card
								key={account.id}
								className={`bg-card border-border p-4 space-y-3 ${account.is_active ? '' : 'opacity-60 bg-muted'}`}
							>
								<div className="flex items-center justify-between gap-2">
									<span className="font-medium">{account.name}</span>
									<Badge variant={account.is_active ? 'default' : 'outline'}>
										{account.is_active ? 'Activa' : 'Inactiva'}
									</Badge>
								</div>
								<dl className="space-y-1 text-sm">
									<div className="flex justify-between gap-2">
										<dt className="text-muted-foreground">Banco</dt>
										<dd>{account.bank}</dd>
									</div>
									<div className="flex justify-between gap-2">
										<dt className="text-muted-foreground">N° de cuenta</dt>
										<dd>{account.account_number}</dd>
									</div>
									<div className="flex justify-between gap-2">
										<dt className="text-muted-foreground">Tipo</dt>
										<dd>{getAccountTypeLabel(account.account_type)}</dd>
									</div>
								</dl>
								<div className="flex gap-2 pt-1">{renderActions(account, true)}</div>
							</Card>
						))}
					</div>
				</>
			)}

			<Dialog open={isFormOpen} onOpenChange={handleFormOpenChange}>
				<DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{editingAccount ? 'Editar cuenta' : 'Nueva cuenta'}</DialogTitle>
						<DialogDescription>
							{editingAccount
								? 'Modifica los datos de la cuenta bancaria'
								: 'Agrega una nueva cuenta bancaria para transferencias'}
						</DialogDescription>
					</DialogHeader>
					<BankAccountForm
						account={editingAccount ?? undefined}
						onSave={handleFormSave}
						onCancel={() => handleFormOpenChange(false)}
					/>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={!!accountToDeactivate}
				onOpenChange={(open) => {
					if (!open && !loading) setAccountToDeactivate(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Desactivar cuenta bancaria?</AlertDialogTitle>
						<AlertDialogDescription>
							La cuenta dejará de aparecer al registrar transacciones, pero las transacciones
							históricas conservarán su cuenta. Podrás reactivarla cuando quieras.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDeactivate}
							disabled={loading}
							className="bg-destructive text-destructive-foreground"
						>
							{loading ? 'Desactivando...' : 'Desactivar'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
