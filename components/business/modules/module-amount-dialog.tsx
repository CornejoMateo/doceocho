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
import { formatNumber } from '@/utils/formats-money';

interface ModuleAmountDialogProps {
	open: boolean;
	value: string;
	error: string | null;
	isSubmitting: boolean;
	isLoadingDefault?: boolean;
	onValueChange: (value: string) => void;
	onCancel: () => void;
	onConfirm: () => void;
}

export function ModuleAmountDialog({
	open,
	value,
	error,
	isSubmitting,
	isLoadingDefault = false,
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
					<div className="relative">
						<Input
							type="text"
							min="0"
							placeholder={isLoadingDefault ? 'Cargando precio sugerido...' : 'Monto'}
							value={value}
							onChange={(e) => onValueChange(formatNumber(e.target.value))}
							disabled={isSubmitting || isLoadingDefault}
							autoFocus
						/>
						{isLoadingDefault && (
							<Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
						)}
					</div>
					{error && <p className="text-xs text-destructive">{error}</p>}
				</div>
				<div className="flex justify-end gap-2 pt-2">
					<Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
						Cancelar
					</Button>
					<Button type="button" onClick={onConfirm} disabled={isSubmitting || isLoadingDefault}>
						{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
						Aceptar
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
