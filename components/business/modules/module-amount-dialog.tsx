'use client';

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface ModuleAmountDialogProps {
	open: boolean;
	value: string;
	error: string | null;
	isSubmitting: boolean;
	onValueChange: (value: string) => void;
	onCancel: () => void;
	onConfirm: () => void;
}

export function ModuleAmountDialog({
	open,
	value,
	error,
	isSubmitting,
	onValueChange,
	onCancel,
	onConfirm,
}: ModuleAmountDialogProps) {
	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) onCancel();
			}}
		>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Cargar monto</DialogTitle>
					<DialogDescription>
						Para aprobar el módulo es necesario cargar el monto correspondiente.
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-2">
					<Input
						type="number"
						min="0"
						step="0.01"
						placeholder="Monto"
						value={value}
						onChange={(e) => onValueChange(e.target.value)}
						disabled={isSubmitting}
						autoFocus
					/>
					{error && <p className="text-xs text-destructive">{error}</p>}
				</div>
				<div className="flex justify-end gap-2 pt-2">
					<Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
						Cancelar
					</Button>
					<Button type="button" onClick={onConfirm} disabled={isSubmitting}>
						{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
						Aceptar
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
