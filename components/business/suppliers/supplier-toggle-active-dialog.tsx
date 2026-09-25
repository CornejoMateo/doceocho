'use client';

import { useRef } from 'react';
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

interface SupplierToggleActiveDialogProps {
	supplier: Supplier | null;
	loading: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

export function SupplierToggleActiveDialog({
	supplier,
	loading,
	onConfirm,
	onCancel,
}: SupplierToggleActiveDialogProps) {
	const last = useRef<Supplier | null>(supplier);
	if (supplier) last.current = supplier;
	const shown = supplier ?? last.current;
	const deactivating = shown?.is_active ?? true;
	const name = shown ? `"${shown.name}"` : 'el proveedor';

	return (
		<AlertDialog
			open={!!supplier}
			onOpenChange={(open) => {
				if (!open && !loading) onCancel();
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{deactivating ? '¿Desactivar proveedor?' : '¿Activar proveedor?'}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{deactivating
							? `${name} dejará de aparecer en el listado de "Activos". Podés reactivarlo en cualquier momento.`
							: `${name} volverá a aparecer en el listado de "Activos".`}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
					<AlertDialogAction
						onClick={(e) => {
							e.preventDefault();
							if (!loading) onConfirm();
						}}
						disabled={loading}
					>
						{loading
							? deactivating
								? 'Desactivando...'
								: 'Activando...'
							: deactivating
								? 'Desactivar'
								: 'Activar'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
