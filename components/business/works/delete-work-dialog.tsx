'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteWorkDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => Promise<void>;
	workName: string;
}

export function DeleteWorkDialog({
	isOpen,
	onOpenChange,
	onConfirm,
	workName,
}: DeleteWorkDialogProps) {
	const [isDeleting, setIsDeleting] = useState(false);

	const handleConfirm = async () => {
		setIsDeleting(true);
		try {
			await onConfirm();
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle className="text-destructive flex items-center gap-2">
						<AlertTriangle className="h-5 w-5" />
						Eliminar obra
					</DialogTitle>
					<DialogDescription>
						¿Estás seguro de que deseas eliminar la obra {workName || 'sin nombre'}?
					</DialogDescription>
					<div className="text-sm text-muted-foreground">
						<p>Esta acción eliminará permanentemente todo lo asociado a esta obra:</p>
						<ul className="mt-2 list-inside list-disc space-y-0.5">
							<li>Checklists y sus archivos</li>
							<li>Presupuestos</li>
							<li>Saldos y transacciones</li>
							<li>Archivos</li>
						</ul>
						<p className="mt-2 font-medium text-destructive">Esta acción no se puede deshacer.</p>
					</div>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
						Cancelar
					</Button>
					<Button variant="destructive" onClick={handleConfirm} disabled={isDeleting}>
						<Trash2 className="mr-2 h-4 w-4" />
						{isDeleting ? 'Eliminando...' : 'Eliminar'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
