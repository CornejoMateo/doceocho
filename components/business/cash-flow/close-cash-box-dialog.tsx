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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/utils/formats-money';

interface CloseCashBoxDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentBalance: number;
	onCloseCashBox: (balance: number, notes?: string) => void;
}

export function CloseCashBoxDialog({
	open,
	onOpenChange,
	currentBalance,
	onCloseCashBox,
}: CloseCashBoxDialogProps) {
	const [notes, setNotes] = useState('');
	const [loading, setLoading] = useState(false);

	const handleSubmit = async () => {
		setLoading(true);
		try {
			await onCloseCashBox(currentBalance, notes || undefined);
			setNotes('');
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle className="text-destructive flex items-center gap-2">
						<AlertTriangle className="h-5 w-5" />
						Cerrar y reiniciar caja
					</DialogTitle>
					<DialogDescription>
						Estás a punto de cerrar la caja actual. El saldo actual se guardará como saldo final.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="p-4 rounded-lg bg-secondary">
						<Label className="text-sm font-medium text-muted-foreground">Saldo Actual</Label>
						<p className="text-2xl font-bold text-foreground mt-1">
							{formatCurrency(currentBalance)}
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="notes">Notas (opcional)</Label>
						<Textarea
							id="notes"
							placeholder="Agrega notas sobre el cierre de caja..."
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={3}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => {
							onOpenChange(false);
							setNotes('');
						}}
					>
						Cancelar
					</Button>
					<Button variant="destructive" onClick={handleSubmit} disabled={loading}>
						{loading ? 'Cerrando...' : 'Cerrar Caja'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
