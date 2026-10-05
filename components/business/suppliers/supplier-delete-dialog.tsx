'use client';

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
import { Supplier } from '@/lib/suppliers/suppliers';

interface SupplierDeleteDialogProps {
	supplier: Supplier | null;
	loading: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

export function SupplierDeleteDialog({
	supplier,
	loading,
	onConfirm,
	onCancel,
}: SupplierDeleteDialogProps) {
	return (
		<AlertDialog
			open={!!supplier}
			onOpenChange={(open) => {
				if (!open && !loading) onCancel();
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
					<AlertDialogDescription>
						Se eliminará {supplier ? `"${supplier.name}"` : 'el proveedor'} de forma permanente. Si
						solo querés dejar de usarlo, es mejor desactivarlo.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
					<AlertDialogAction
						onClick={(e) => {
							e.preventDefault();
							onConfirm();
						}}
						disabled={loading}
						className="bg-destructive text-destructive-foreground"
					>
						{loading ? 'Eliminando...' : 'Eliminar'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
